import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto';
import { BookingStatus, SlotStatus, PaymentStatus, Prisma } from '@prisma/client';
import { validateTransition } from './booking-state-machine';
import { CancellationPolicyService } from './cancellation-policy.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletTransactionType } from '@prisma/client';
import { PlatformWalletService } from '@modules/platform-wallet/platform-wallet.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cancellationPolicyService: CancellationPolicyService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly platformWalletService: PlatformWalletService,
  ) {}

  /**
   * Create a new booking with slot locking to prevent race conditions
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    // Check if user is suspended and verified
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        suspendedUntil: true,
        isVerified: true,
        email: true,
      },
    });

    // Check email verification
    if (!user?.isVerified) {
      throw new BadRequestException({
        code: 'EMAIL_NOT_VERIFIED',
        message: {
          en: 'Please verify your email before creating bookings',
          ar: 'يرجى التحقق من بريدك الإلكتروني قبل إنشاء الحجوزات',
        },
        action: 'VERIFY_EMAIL',
        resendEndpoint: '/auth/resend-verification',
        email: user?.email,
      });
    }

    if (user?.suspendedUntil && user.suspendedUntil > new Date()) {
      throw new BadRequestException(
        `Your account is suspended until ${user.suspendedUntil.toLocaleDateString()}. You cannot create bookings during suspension.`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Lock user's wallet first to prevent concurrent bookings from causing race conditions
        // This ensures only one booking can be processed at a time for this user
        await tx.$queryRaw`
          SELECT * FROM "Wallet"
          WHERE "userId" = ${userId}
          FOR UPDATE
        `;

        // Lock the time slot using SELECT FOR UPDATE
        const timeSlot = await tx.$queryRaw<
          Array<{
            id: string;
            fieldId: string;
            date: Date;
            startTime: Date;
            endTime: Date;
            price: Prisma.Decimal;
            status: SlotStatus;
          }>
        >`
          SELECT * FROM "TimeSlot"
          WHERE id = ${dto.timeSlotId}
          FOR UPDATE
        `;

        if (!timeSlot || timeSlot.length === 0) {
          throw new NotFoundException('Time slot not found');
        }

        const slot = timeSlot[0];

        // Validate slot is available
        if (slot.status !== SlotStatus.AVAILABLE) {
          throw new BadRequestException('Time slot is not available');
        }

        // Validate slot is in the future with minimum lead time (30 minutes)
        const now = new Date();
        const slotDateTime = new Date(slot.date);
        const [hours, minutes, seconds] = slot.startTime
          .toString()
          .split(':')
          .map(Number);
        slotDateTime.setHours(hours, minutes, seconds || 0);

        if (slotDateTime <= now) {
          throw new BadRequestException('Cannot book past time slots');
        }

        // Require minimum 30 minutes lead time
        const minimumLeadTimeMs = 30 * 60 * 1000; // 30 minutes
        if (slotDateTime.getTime() - now.getTime() < minimumLeadTimeMs) {
          throw new BadRequestException(
            'Bookings must be made at least 30 minutes in advance',
          );
        }

        // Get field details for commission calculation
        const field = await tx.field.findUnique({
          where: { id: slot.fieldId, deletedAt: null },
          select: {
            id: true,
            ownerId: true,
            commissionRate: true,
          },
        });

        if (!field) {
          throw new NotFoundException('Field not found or has been deleted');
        }

        // Prevent field owners from booking their own fields
        if (field.ownerId === userId) {
          throw new BadRequestException(
            'Field owners cannot book their own fields',
          );
        }

        // Get deposit percentage from app settings (default 100%)
        const depositSetting = await tx.appSetting.findUnique({
          where: { key: 'deposit_percentage' },
        });
        const depositPercentage = depositSetting
          ? parseFloat(depositSetting.value)
          : 100;

        // Validate deposit percentage
        if (depositPercentage > 100) {
          throw new BadRequestException(
            'Deposit percentage cannot exceed 100%',
          );
        }

        if (depositPercentage < 0) {
          throw new BadRequestException(
            'Deposit percentage cannot be negative',
          );
        }

        // Get global commission rate if field doesn't have custom rate
        let commissionRate = field.commissionRate;
        if (!commissionRate) {
          const globalCommissionSetting = await tx.appSetting.findUnique({
            where: { key: 'global_commission_rate' },
          });
          commissionRate = globalCommissionSetting
            ? new Prisma.Decimal(globalCommissionSetting.value)
            : new Prisma.Decimal(10); // Default 10%
        }

        // Validate deposit percentage is >= commission rate for this field
        const commissionRateNum = parseFloat(commissionRate.toString());
        if (depositPercentage < commissionRateNum) {
          throw new BadRequestException(
            `Cannot create booking: Deposit percentage (${depositPercentage}%) is lower than this field's commission rate (${commissionRateNum}%). Please contact support.`,
          );
        }

        // Calculate amounts
        const totalPrice = slot.price;
        
        // Deposit is a percentage of total price
        // Minimum deposit = commission rate (to ensure platform can collect commission)
        // Admin configures deposit percentage (must be >= commission rate)
        const depositAmount = totalPrice
          .mul(depositPercentage)
          .div(100)
          .toDecimalPlaces(2);
        
        // Commission is calculated from TOTAL price (not deposit)
        // Commission rate is configurable per field or globally (default 10%)
        const commissionAmount = totalPrice
          .mul(commissionRate)
          .div(100)
          .toDecimalPlaces(2);

        // Owner revenue from deposit = deposit - commission
        // If deposit equals commission, owner gets 0 from deposit
        // Owner will receive the remaining amount in cash at the field
        const ownerRevenue = depositAmount.sub(commissionAmount).toDecimalPlaces(2);
        
        // Ensure owner revenue is not negative (can be 0 if deposit = commission)
        const finalOwnerRevenue = ownerRevenue.lessThan(0) 
          ? new Prisma.Decimal(0) 
          : ownerRevenue;

        // Set payment deadline (15 minutes from now)
        const paymentDeadline = new Date(now.getTime() + 15 * 60 * 1000);

        // Create booking
        const booking = await tx.booking.create({
          data: {
            playerId: userId,
            fieldId: slot.fieldId,
            timeSlotId: slot.id,
            status: BookingStatus.PENDING_PAYMENT,
            totalPrice,
            depositAmount,
            commissionRate: commissionRate as Prisma.Decimal,
            commissionAmount,
            ownerRevenue: finalOwnerRevenue,
            paymentDeadline,
            scheduledDate: slot.date,
            scheduledStartTime: slot.startTime,
            scheduledEndTime: slot.endTime,
          },
          include: {
            field: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            timeSlot: true,
          },
        });

        // Create status history entry
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: null,
            toStatus: BookingStatus.PENDING_PAYMENT,
            reason: 'Booking created',
          },
        });

        // Update time slot status to BOOKED
        await tx.timeSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.BOOKED },
        });

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 seconds
      },
    );
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerId: true,
          },
        },
        timeSlot: true,
        payment: true,
        qrCode: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      ...booking,
      remainingAmount: new Prisma.Decimal(booking.totalPrice.toString())
        .sub(booking.depositAmount.toString())
        .toDecimalPlaces(2),
    };
  }

  /**
   * Get user's bookings with filters
   */
  async getUserBookings(
    userId: string,
    filters?: {
      status?: BookingStatus;
      statuses?: BookingStatus[];
      fieldId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { playerId: userId };

    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    } else if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.fieldId) {
      where.fieldId = filters.fieldId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.scheduledDate.lte = filters.endDate;
      }
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          field: {
            select: { id: true, name: true, address: true },
          },
          timeSlot: true,
          payment: true,
          qrCode: { select: { qrToken: true, imageUrl: true, isUsed: true } },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    const now = new Date();

    return {
      bookings: bookings.map((b) => {
        // Build scheduled datetime for cancellation logic
        const startTime = new Date(b.scheduledStartTime);
        const scheduledDateTime = new Date(b.scheduledDate);
        scheduledDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0);

        const hoursUntil = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const cancellableStatuses = ['PENDING_PAYMENT', 'CONFIRMED'];
        const canCancel = cancellableStatuses.includes(b.status) && hoursUntil > 0;
        const willGetRefund = hoursUntil > 3;

        return {
          id: b.id,
          bookingNumber: b.bookingNumber ?? null,
          status: b.status,
          scheduledDate: b.scheduledDate,
          scheduledStartTime: b.scheduledStartTime,
          scheduledEndTime: b.scheduledEndTime,
          totalPrice: b.totalPrice,
          depositAmount: b.depositAmount,
          remainingAmount: new Prisma.Decimal(b.totalPrice.toString())
            .sub(b.depositAmount.toString())
            .toDecimalPlaces(2),
          refundAmount: b.refundAmount ?? null,
          paymentDeadline: b.paymentDeadline ?? null,
          cancelledAt: b.cancelledAt ?? null,
          field: b.field,
          payment: b.payment ? { status: b.payment.status, gateway: b.payment.gateway } : null,
          hasQr: !!b.qrCode,
          qr: b.qrCode ? { token: b.qrCode.qrToken, imageUrl: b.qrCode.imageUrl, isUsed: b.qrCode.isUsed } : null,
          canCancel,
          willGetRefund,
          hoursUntilBooking: Math.round(hoursUntil * 10) / 10,
          createdAt: b.createdAt,
        };
      }),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update booking status with validation and history tracking
   */
  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get current booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Validate transition
      validateTransition(booking.status, newStatus);

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: newStatus },
        include: {
          field: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          timeSlot: true,
          payment: true,
        },
      });

      // Record status change in history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: newStatus,
          reason: reason || `Status changed to ${newStatus}`,
        },
      });

      // Emit event for notifications (placeholder for future implementation)
      // this.eventEmitter.emit('booking.status.changed', {
      //   bookingId,
      //   fromStatus: booking.status,
      //   toStatus: newStatus,
      //   booking: updatedBooking,
      // });

      return updatedBooking;
    });
  }

  /**
   * Confirm booking (after successful payment)
   */
  async confirmBooking(bookingId: string) {
    return this.updateBookingStatus(
      bookingId,
      BookingStatus.CONFIRMED,
      'Payment confirmed',
    );
  }

  /**
   * Mark booking as payment failed
   */
  async markPaymentFailed(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await this.updateBookingStatus(
        bookingId,
        BookingStatus.PAYMENT_FAILED,
        'Payment failed',
      );

      // Release the time slot
      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      return booking;
    });
  }

  /**
   * Cancel booking with refund processing
   * Calculates refund based on cancellation policy and processes wallet transactions
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
  ): Promise<{
    booking: any;
    refundAmount: number;
    refundPercentage: number;
  }> {
    // Check email verification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true, email: true },
    });

    if (!user?.isVerified) {
      throw new BadRequestException({
        code: 'EMAIL_NOT_VERIFIED',
        message: {
          en: 'Please verify your email before cancelling bookings',
          ar: 'يرجى التحقق من بريدك الإلكتروني قبل إلغاء الحجوزات',
        },
        action: 'VERIFY_EMAIL',
        resendEndpoint: '/auth/resend-verification',
        email: user?.email,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock the booking row to prevent race conditions / double refund
      const [lockedBooking] = await tx.$queryRaw<any[]>`
        SELECT id, status, "playerId", "timeSlotId", "depositAmount", "scheduledDate",
               "scheduledStartTime", "paymentDeadline"
        FROM "Booking" WHERE id = ${bookingId} FOR UPDATE
      `;

      if (!lockedBooking) {
        throw new NotFoundException('Booking not found');
      }

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { field: { select: { ownerId: true } }, payment: true },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      // Check if user is the player or field owner
      const isPlayer = booking.playerId === userId;
      const isFieldOwner = booking.field.ownerId === userId;

      if (!isPlayer && !isFieldOwner) {
        throw new ForbiddenException(
          'Only the player or field owner can cancel this booking',
        );
      }

      // Validate booking can be cancelled
      if (
        booking.status !== BookingStatus.PENDING_PAYMENT &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          `Cannot cancel booking with status ${booking.status}`,
        );
      }

      // Calculate refund based on who is cancelling
      let refundCalculation;
      if (isFieldOwner) {
        // Field owner cancellation - always 100% refund
        refundCalculation =
          this.cancellationPolicyService.calculateFieldOwnerCancellationRefund(
            parseFloat(booking.depositAmount.toString()),
          );
      } else {
        // Player cancellation - use policy
        // scheduledStartTime is a DateTime, extract time components
        const startTime = new Date(booking.scheduledStartTime);
        const scheduledDateTime = new Date(booking.scheduledDate);
        scheduledDateTime.setHours(
          startTime.getHours(),
          startTime.getMinutes(),
          startTime.getSeconds(),
        );

        refundCalculation =
          await this.cancellationPolicyService.calculateRefund(
            parseFloat(booking.depositAmount.toString()),
            scheduledDateTime,
          );
      }

      // Update booking status with new specific statuses
      const newStatus = refundCalculation.refundAmount > 0
        ? 'CANCELLED_REFUNDED' as BookingStatus
        : 'CANCELLED_NO_REFUND' as BookingStatus;

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          cancelledAt: new Date(),
          cancelledBy: userId,
          refundAmount: new Prisma.Decimal(refundCalculation.refundAmount),
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
          timeSlot: true,
          payment: true,
        },
      });

      // Record status change in history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: newStatus,
          reason:
            reason ||
            `Booking cancelled by ${isFieldOwner ? 'field owner' : 'player'}. Refund: ${refundCalculation.refundPercentage}%`,
        },
      });

      // Release the time slot
      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { status: SlotStatus.AVAILABLE },
      });

      // Process refund if amount > 0 and payment was successful
      if (
        refundCalculation.refundAmount > 0 &&
        booking.payment &&
        booking.payment.status === PaymentStatus.COMPLETED
      ) {
        // Calculate how much to refund from platform and owner
        const depositAmount = Number(booking.depositAmount);
        const commissionAmount = Number(booking.commissionAmount);
        const ownerShare = depositAmount - commissionAmount;
        
        // Determine refund split based on refund percentage
        const refundPercentage = refundCalculation.refundPercentage / 100;
        const platformRefund = commissionAmount * refundPercentage;
        const ownerRefund = ownerShare * refundPercentage;

        // Credit player wallet with full refund
        await this.walletService.credit(
          booking.playerId,
          refundCalculation.refundAmount,
          WalletTransactionType.REFUND,
          `Refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`,
          bookingId,
          { actorRole: 'PLAYER', transactionPurpose: 'PLAYER_REFUND' },
        );

        // Debit platform wallet for its share of the refund
        await this.platformWalletService.debit(
          platformRefund,
          'BOOKING_REFUND',
          bookingId,
          `Platform refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`,
          bookingId,
        );

        // Debit owner wallet for their share of the refund (if they received any)
        if (ownerRefund > 0) {
          await this.walletService.debit(
            booking.field.ownerId,
            ownerRefund,
            WalletTransactionType.REFUND,
            `Owner refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`,
            bookingId,
            { actorRole: 'OWNER', transactionPurpose: 'OWNER_REFUND' },
          );
        }

        // Update payment status to REFUNDED
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: 'REFUNDED' },
        });
      }

      // Send cancellation notifications
      try {
        // Get player and field owner preferred languages
        const player = await tx.user.findUnique({
          where: { id: booking.playerId },
          select: { preferredLanguage: true },
        });

        const fieldOwner = await tx.user.findUnique({
          where: { id: booking.field.ownerId },
          select: { preferredLanguage: true },
        });

        const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
        const refundAmountStr = refundCalculation.refundAmount.toFixed(2);

        // Send notification to player
        await this.notificationsService.sendCancellationNotification(
          booking.playerId,
          updatedBooking.field.name,
          formattedDate,
          refundAmountStr,
          player?.preferredLanguage || 'en',
        );

        // Send notification to field owner
        await this.notificationsService.sendCancellationNotification(
          booking.field.ownerId,
          updatedBooking.field.name,
          formattedDate,
          refundAmountStr,
          fieldOwner?.preferredLanguage || 'en',
        );
      } catch (error) {
        // Log error but don't fail the transaction
        console.error('Failed to send cancellation notifications:', error);
      }

      return {
        booking: updatedBooking,
        refundAmount: refundCalculation.refundAmount,
        refundPercentage: refundCalculation.refundPercentage,
      };
    });
  }

  /**
   * Check in booking (when player arrives at field)
   */
  async checkInBooking(bookingId: string, fieldOwnerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate field owner
    if (booking.field.ownerId !== fieldOwnerId) {
      throw new ForbiddenException(
        'Only the field owner can check in this booking',
      );
    }

    // Validate booking date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.scheduledDate);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate.getTime() !== today.getTime()) {
      throw new BadRequestException(
        'Booking can only be checked in on the scheduled date',
      );
    }

    return this.updateBookingStatus(
      bookingId,
      BookingStatus.CHECKED_IN,
      'Player checked in',
    );
  }

  /**
   * Mark booking as no-show
   * When a player doesn't show up:
   * - Player's deposit is forfeited (no refund)
   * - Field owner receives the commission portion as compensation
   * - Platform keeps its commission
   */
  async markNoShow(bookingId: string, ownerId: string) {
      return this.prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            field: {
              select: {
                ownerId: true,
              },
            },
          },
        });

        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        // Verify ownership
        if (booking.field.ownerId !== ownerId) {
          throw new ForbiddenException({
            en: 'Only the field owner can mark this booking as no-show',
            ar: 'يمكن لصاحب الملعب فقط تحديد هذا الحجز كعدم حضور',
          });
        }

        // Update booking status to NO_SHOW
        const updatedBooking = await this.updateBookingStatus(
          bookingId,
          BookingStatus.NO_SHOW,
          'Player did not show up',
        );

        // Increment player's no-show count
        await tx.user.update({
          where: { id: booking.playerId },
          data: {
            noShowCount: {
              increment: 1,
            },
          },
        });

        // Check if player should be suspended (3 no-shows)
        const player = await tx.user.findUnique({
          where: { id: booking.playerId },
          select: { noShowCount: true, preferredLanguage: true },
        });

        if (player && player.noShowCount >= 3) {
          const suspensionEnd = new Date();
          suspensionEnd.setDate(suspensionEnd.getDate() + 30); // 30 days suspension

          await tx.user.update({
            where: { id: booking.playerId },
            data: {
              suspendedUntil: suspensionEnd,
            },
          });
        }

        // Credit field owner with the commission portion as no-show compensation
        // Since owner already received their share (deposit - commission) at payment time,
        // we now give them the commission portion as well, so they receive the full deposit
        // This compensates them for the player's no-show
        const commissionAmount = Number(booking.commissionAmount);

        if (commissionAmount > 0) {
          await this.walletService.credit(
            booking.field.ownerId,
            commissionAmount,
            WalletTransactionType.CREDIT,
            `No-show compensation for booking ${bookingId} (commission portion)`,
            bookingId,
            { actorRole: 'OWNER', transactionPurpose: 'NO_SHOW_COMPENSATION' },
          );

          this.logger.log(
            `Credited ${commissionAmount} (commission) to owner as no-show compensation for booking ${bookingId}`,
          );
        }

        // Send no-show notification
        try {
          const bookingWithField = await tx.booking.findUnique({
            where: { id: bookingId },
            include: {
              field: {
                select: { name: true },
              },
            },
          });

          if (bookingWithField && player) {
            await this.notificationsService.sendNoShowNotification(
              booking.playerId,
              bookingWithField.field.name,
              player.noShowCount,
              player.preferredLanguage || 'en',
            );
          }
        } catch (error) {
          // Log error but don't fail the transaction
          console.error('Failed to send no-show notification:', error);
        }

        return updatedBooking;
      });
    }


  /**
   * Complete booking
   */
  async completeBooking(bookingId: string) {
    return this.updateBookingStatus(
      bookingId,
      BookingStatus.COMPLETED,
      'Booking completed',
    );
  }

  /**
   * Get booking status history
   */
  async getBookingStatusHistory(bookingId: string) {
    const history = await this.prisma.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    return history;
  }

  /**
   * Get bookings for field owner
   * Returns bookings for all fields owned by the user
   */
  async getOwnerBookings(
      ownerId: string,
      filters?: {
        fieldId?: string;
        status?: BookingStatus;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
      },
    ) {
      console.log('\n=== getOwnerBookings DEBUG ===');
      console.log('Owner ID:', ownerId);
      console.log('Filters:', filters);
      
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Build SQL WHERE conditions
      let whereConditions = `f."ownerId"::text = $1 AND f."deletedAt" IS NULL`;
      const params: any[] = [ownerId];
      let paramIndex = 2;

      if (filters?.fieldId) {
        whereConditions += ` AND b."fieldId"::text = $${paramIndex}`;
        params.push(filters.fieldId);
        paramIndex++;
      }

      if (filters?.status) {
        whereConditions += ` AND b.status::text = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.startDate) {
        whereConditions += ` AND b."scheduledDate" >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters?.endDate) {
        whereConditions += ` AND b."scheduledDate" <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count
         FROM "Booking" b
         INNER JOIN "Field" f ON b."fieldId"::text = f.id::text
         WHERE ${whereConditions}`,
        ...params
      );
      const total = Number(countResult[0]?.count || 0);

      console.log('📊 Total count:', total);
      console.log('📊 WHERE conditions:', whereConditions);
      console.log('📊 Params:', params);

      // Get bookings with all data
      const bookings = await this.prisma.$queryRawUnsafe<Array<any>>(
        `SELECT 
          b.id,
          b."fieldId",
          b."playerId",
          b."scheduledDate",
          b."scheduledStartTime",
          b."scheduledEndTime",
          b.status,
          b."depositAmount",
          b."totalPrice",
          (b."totalPrice" - b."depositAmount") as "remainingAmount",
          b."createdAt",
          b."updatedAt",
          f.name as "fieldName",
          f."nameAr" as "fieldNameAr",
          u.email,
          u."phoneNumber" as phone,
          p.status as "paymentStatus",
          q."qrToken",
          q."isUsed" as "qrIsUsed",
          q."usedAt" as "qrUsedAt"
         FROM "Booking" b
         INNER JOIN "Field" f ON b."fieldId"::text = f.id::text
         INNER JOIN "User" u ON b."playerId"::text = u.id::text
         LEFT JOIN "Payment" p ON b.id::text = p."bookingId"::text
         LEFT JOIN "QrCode" q ON b.id::text = q."bookingId"::text
         WHERE ${whereConditions}
         ORDER BY b."scheduledDate" DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        ...params,
        limit,
        offset
      );

      console.log('📦 Bookings found:', bookings.length);
      if (bookings.length > 0) {
        console.log('📦 First booking:', bookings[0]);
      }
      console.log('=== END DEBUG ===\n');

      // Transform bookings
      const transformedBookings = bookings.map((booking) => ({
        id: booking.id,
        fieldId: booking.fieldId,
        fieldName: booking.fieldName,
        fieldNameAr: booking.fieldNameAr,
        playerId: booking.playerId,
        playerName: null,
        email: booking.email,
        phone: booking.phone,
        scheduledDate: booking.scheduledDate,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndTime: booking.scheduledEndTime,
        status: booking.status,
        paymentStatus: booking.paymentStatus || null,
        depositAmount: booking.depositAmount,
        remainingAmount: booking.remainingAmount,
        totalPrice: booking.totalPrice,
        isCheckedIn: booking.status === BookingStatus.CHECKED_IN || booking.status === BookingStatus.COMPLETED,
        checkedInAt: booking.qrUsedAt || null,
        hasQr: !!booking.qrToken,
        qrToken: booking.qrToken || null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      }));

      return {
        bookings: transformedBookings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

}
