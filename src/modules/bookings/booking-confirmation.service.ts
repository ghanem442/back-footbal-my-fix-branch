import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { QrService } from '../qr/qr.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus, PaymentGateway, WalletTransactionType, Prisma } from '@prisma/client';
import { PlatformWalletService } from '@modules/platform-wallet/platform-wallet.service';

/**
 * Booking Confirmation Service
 * 
 * Handles booking confirmation logic after successful payment.
 * This includes:
 * - Updating booking status to CONFIRMED
 * - Recording status change in history
 * - Calculating net amount (price - commission)
 * - Crediting field owner wallet
 * - Recording commission in revenue tracking
 * 
 * Requirements: 10.5, 12.3, 12.4, 12.5
 */
@Injectable()
export class BookingConfirmationService {
  private readonly logger = new Logger(BookingConfirmationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly qrService: QrService,
    private readonly notificationsService: NotificationsService,
    private readonly platformWalletService: PlatformWalletService,
  ) {}

  /**
   * Confirm booking after successful payment
   * 
   * This method orchestrates all the steps needed to confirm a booking:
   * 1. Update booking status to CONFIRMED
   * 2. Record status change in history
   * 3. Calculate net amount after commission
   * 4. Credit field owner wallet
   * 5. Record commission in revenue tracking
   * 6. Trigger QR code generation (placeholder)
   * 7. Trigger notification sending (placeholder)
   * 
   * @param bookingId - The booking ID to confirm
   * @param gateway - The payment gateway used
   * @returns The confirmed booking with related data
   */
  async confirmBooking(bookingId: string, gateway: PaymentGateway) {
    this.logger.log(`Starting booking confirmation for booking ${bookingId}`);

    return this.prisma.$transaction(
      async (tx) => {
        // Get booking with all related data
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            field: {
              select: {
                id: true,
                name: true,
                ownerId: true,
              },
            },
            player: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        if (!booking) {
          throw new Error(`Booking ${bookingId} not found`);
        }

        // Validate booking is in PENDING_PAYMENT status
        if (booking.status !== BookingStatus.PENDING_PAYMENT) {
          this.logger.warn(
            `Booking ${bookingId} is not in PENDING_PAYMENT status. Current status: ${booking.status}`,
          );
          throw new Error(
            `Booking is not in PENDING_PAYMENT status. Current status: ${booking.status}`,
          );
        }

        // 1. Update booking status to CONFIRMED with bookingNumber
        const bookingNumber = `BK-${Date.now()}-${bookingId.slice(0, 6).toUpperCase()}`;
        const confirmedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            bookingNumber,
            updatedAt: new Date(),
          },
          include: {
            field: {
              select: {
                id: true,
                name: true,
                address: true,
                ownerId: true,
              },
            },
            player: {
              select: {
                id: true,
                email: true,
              },
            },
            timeSlot: true,
            payment: true,
          },
        });

        // 2. Record status change in history
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: BookingStatus.PENDING_PAYMENT,
            toStatus: BookingStatus.CONFIRMED,
            reason: 'Payment successful',
          },
        });

        this.logger.log(`Booking ${bookingId} status updated to CONFIRMED`);

        // 3. Calculate amounts for reporting (stored in booking, no financial transfer to owner now)
        const depositAmount = Number(booking.depositAmount);
        const commissionAmount = Number(booking.commissionAmount);
        const netAmount = depositAmount - commissionAmount;

        this.logger.log(
          `Booking ${bookingId} settlement: Total=${Number(booking.totalPrice)}, Deposit=${depositAmount}, Commission=${commissionAmount}, Platform receives=${depositAmount}, Owner net (display only)=${netAmount}`,
        );

        // 4. Credit Platform Wallet with full deposit amount
        await this.platformWalletService.credit(
          depositAmount,
          'BOOKING_DEPOSIT',
          bookingId,
          `Booking deposit for ${bookingId} (Total: ${Number(booking.totalPrice)}, Deposit: ${depositAmount}, Commission: ${commissionAmount})`,
          bookingId,
        );

        this.logger.log(
          `Credited ${depositAmount} to platform wallet for booking ${bookingId}`,
        );

        // 5. Credit Owner Wallet with their share (deposit - commission)
        // Owner receives their online share immediately at payment time
        // They will also receive the remaining amount in cash at the field
        const ownerShare = netAmount; // netAmount = depositAmount - commissionAmount
        
        if (ownerShare > 0) {
          await this.walletService.credit(
            booking.field.ownerId,
            ownerShare,
            WalletTransactionType.BOOKING_PAYMENT,
            `Owner share for booking ${bookingId} (Deposit: ${depositAmount}, Commission: ${commissionAmount})`,
            bookingId,
            { actorRole: 'OWNER', transactionPurpose: 'OWNER_ONLINE_SHARE' },
          );

          this.logger.log(
            `Credited ${ownerShare} to owner wallet (${booking.field.ownerId}) for booking ${bookingId}`,
          );
        } else {
          this.logger.log(
            `No owner share to credit for booking ${bookingId} (deposit equals commission)`,
          );
        }

        // 6. Record commission in revenue tracking
        // Note: amount is the deposit amount (20% of total), not the full booking price
        // Field owner will receive the remaining 80% in cash at the field
        await tx.revenue.create({
          data: {
            bookingId,
            fieldId: booking.field.id,
            fieldOwnerId: booking.field.ownerId,
            gateway,
            amount: new Prisma.Decimal(depositAmount),
            commissionAmount: new Prisma.Decimal(commissionAmount),
            ownerRevenue: new Prisma.Decimal(netAmount),
          },
        });

        this.logger.log(
          `Recorded revenue for booking ${bookingId}: Deposit=${depositAmount}, Platform Commission=${commissionAmount}, Field Owner Wallet=${netAmount}`,
        );

        // 6. Generate QR code for booking
        try {
          const qrCode = await this.qrService.generateQrCodeForBooking(bookingId);
          this.logger.log(
            `QR code generated for booking ${bookingId}: ${qrCode.imageUrl}`,
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to generate QR code for booking ${bookingId}: ${errorMessage}`,
          );
          // Don't fail the entire transaction if QR generation fails
          // The booking is still confirmed, QR can be regenerated later
        }

        // 7. Send confirmation notifications
        try {
          // Get player's preferred language
          const player = await tx.user.findUnique({
            where: { id: booking.player.id },
            select: { preferredLanguage: true, email: true },
          });

          // Get field owner's preferred language
          const fieldOwner = await tx.user.findUnique({
            where: { id: booking.field.ownerId },
            select: { preferredLanguage: true },
          });

          // Format date for notification
          const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();

          // Send notification to player
          await this.notificationsService.sendBookingConfirmationNotification(
            booking.player.id,
            booking.field.name,
            formattedDate,
            player?.preferredLanguage || 'en',
          );

          this.logger.log(
            `Sent confirmation notification to player ${booking.player.id}`,
          );

          // Send notification to field owner
          await this.notificationsService.sendNewBookingNotification(
            booking.field.ownerId,
            booking.field.name,
            formattedDate,
            player?.email || 'Player',
            fieldOwner?.preferredLanguage || 'en',
          );

          this.logger.log(
            `Sent new booking notification to field owner ${booking.field.ownerId}`,
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send confirmation notification for booking ${bookingId}: ${errorMessage}`,
          );
          // Don't fail the transaction if notification fails
        }

        this.logger.log(`Booking confirmation completed for ${bookingId}`);

        return confirmedBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000, // 15 seconds
      },
    );
  }

  /**
   * Handle payment failure
   * 
   * This method handles the case when payment fails:
   * 1. Update booking status to PAYMENT_FAILED
   * 2. Release time slot (set status to AVAILABLE)
   * 3. Record failure reason
   * 4. Notify player of failure (placeholder)
   * 
   * Requirements: 10.6
   * 
   * @param bookingId - The booking ID
   * @param failureReason - The reason for payment failure
   * @returns The updated booking
   */
  async handlePaymentFailure(bookingId: string, failureReason?: string) {
    this.logger.log(`Handling payment failure for booking ${bookingId}`);

    return this.prisma.$transaction(
      async (tx) => {
        // Get booking
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            field: {
              select: {
                id: true,
                name: true,
              },
            },
            player: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        if (!booking) {
          throw new Error(`Booking ${bookingId} not found`);
        }

        // 1. Update booking status to PAYMENT_FAILED
        const updatedBooking = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.PAYMENT_FAILED,
            updatedAt: new Date(),
          },
          include: {
            field: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            player: {
              select: {
                id: true,
                email: true,
              },
            },
            timeSlot: true,
            payment: true,
          },
        });

        // 2. Record status change in history with failure reason
        await tx.bookingStatusHistory.create({
          data: {
            bookingId,
            fromStatus: BookingStatus.PENDING_PAYMENT,
            toStatus: BookingStatus.PAYMENT_FAILED,
            reason: failureReason || 'Payment failed',
          },
        });

        this.logger.log(
          `Booking ${bookingId} status updated to PAYMENT_FAILED. Reason: ${failureReason || 'Payment failed'}`,
        );

        // 3. Release time slot (set status to AVAILABLE)
        await tx.timeSlot.update({
          where: { id: booking.timeSlotId },
          data: {
            status: 'AVAILABLE',
          },
        });

        this.logger.log(
          `Time slot ${booking.timeSlotId} released and set to AVAILABLE`,
        );

        // 4. Notify player of failure
        try {
          const player = await tx.user.findUnique({
            where: { id: booking.player.id },
            select: { preferredLanguage: true },
          });

          // Send payment failure notification
          await this.notificationsService.sendPushNotification(
            booking.player.id,
            {
              title: 'Payment Failed',
              body: `Your payment for ${booking.field.name} has failed. Please try again.`,
              data: {
                type: 'payment_failed',
                bookingId: booking.id,
                fieldName: booking.field.name,
              },
              priority: 'high',
            },
          );

          this.logger.log(
            `Sent payment failure notification to player ${booking.player.id}`,
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send payment failure notification: ${errorMessage}`,
          );
          // Don't fail the transaction if notification fails
        }

        this.logger.log(`Payment failure handling completed for ${bookingId}`);

        return updatedBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 seconds
      },
    );
  }
}
