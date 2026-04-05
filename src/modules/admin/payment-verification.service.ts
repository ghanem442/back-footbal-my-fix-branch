import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { BookingConfirmationService } from '@modules/bookings/booking-confirmation.service';
import { PaymentAuditLogService } from './payment-audit-log.service';
import { ListPendingPaymentsDto } from './dto/payment-verification.dto';

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);
  private readonly lockTimeoutMinutes = 10; // Lock expires after 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly bookingConfirmationService: BookingConfirmationService,
    private readonly auditLogService: PaymentAuditLogService,
  ) {}

  /**
   * Lock payment for verification (prevent concurrent admin reviews)
   */
  async lockPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check if already locked by another admin
    if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
      const lockAge = Date.now() - (payment.verificationLockedAt?.getTime() || 0);
      const lockAgeMinutes = lockAge / (1000 * 60);

      // If lock is older than timeout, allow takeover
      if (lockAgeMinutes < this.lockTimeoutMinutes) {
        throw new ConflictException({
          code: 'PAYMENT_LOCKED',
          message: {
            en: 'This payment is currently being reviewed by another admin',
            ar: 'يتم مراجعة هذا الدفع حاليًا من قبل مسؤول آخر',
          },
          lockedBy: payment.verificationLockedBy,
          lockedAt: payment.verificationLockedAt,
        });
      }
    }

    // Lock the payment
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        verificationLockedBy: adminId,
        verificationLockedAt: new Date(),
      },
    });

    // Log the action
    await this.auditLogService.log({
      paymentId,
      adminId,
      action: 'LOCKED',
      metadata: { lockTimeout: this.lockTimeoutMinutes },
    });

    this.logger.log(`Payment ${paymentId} locked by admin ${adminId}`);

    return { locked: true, expiresIn: this.lockTimeoutMinutes };
  }

  /**
   * Unlock payment
   */
  async unlockPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only the admin who locked it can unlock (or if lock expired)
    if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
      const lockAge = Date.now() - (payment.verificationLockedAt?.getTime() || 0);
      const lockAgeMinutes = lockAge / (1000 * 60);

      if (lockAgeMinutes < this.lockTimeoutMinutes) {
        throw new BadRequestException('You cannot unlock a payment locked by another admin');
      }
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        verificationLockedBy: null,
        verificationLockedAt: null,
      },
    });

    // Log the action
    await this.auditLogService.log({
      paymentId,
      adminId,
      action: 'UNLOCKED',
    });

    this.logger.log(`Payment ${paymentId} unlocked by admin ${adminId}`);

    return { unlocked: true };
  }

  /**
   * Get pending payment verifications
   */
  async getPendingPayments(dto: ListPendingPaymentsDto) {
    const { page = 1, limit = 20, paymentMethod, startDate, endDate } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      verificationStatus: 'PENDING',
      screenshotUrl: { not: null },
      gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
    };

    if (paymentMethod) {
      where.gateway = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              field: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        amount: p.amount.toString(),
        gateway: p.gateway,
        screenshotUrl: p.screenshotUrl,
        playerNotes: p.playerNotes,
        createdAt: p.createdAt,
        player: p.booking.player,
        booking: {
          id: p.booking.id,
          bookingNumber: p.booking.bookingNumber,
          fieldName: p.booking.field.name,
          fieldNameAr: p.booking.field.nameAr,
          scheduledDate: p.booking.scheduledDate,
          scheduledStartTime: p.booking.scheduledStartTime,
          scheduledEndTime: p.booking.scheduledEndTime,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve payment verification
   */
  async approvePayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            player: {
              select: {
                id: true,
                preferredLanguage: true,
              },
            },
            field: {
              select: {
                name: true,
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Payment already approved');
    }

    if (payment.verificationStatus === 'REJECTED') {
      throw new BadRequestException('Cannot approve rejected payment');
    }

    if (!payment.screenshotUrl) {
      throw new BadRequestException('No screenshot uploaded for this payment');
    }

    // Check booking status before approval
    // Booking must be in PENDING_PAYMENT status to be confirmed
    if (payment.booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException({
        message: `Cannot approve payment for booking with status ${payment.booking.status}. Booking may have expired or been cancelled.`,
        code: 'BOOKING_NOT_PENDING',
        bookingStatus: payment.booking.status,
        bookingId: payment.bookingId,
      });
    }

    // Check if payment is locked by another admin
    if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
      const lockExpiry = new Date(payment.verificationLockedAt!);
      lockExpiry.setMinutes(lockExpiry.getMinutes() + 10); // 10-minute lock
      
      if (new Date() < lockExpiry) {
        throw new BadRequestException({
          message: 'Payment is currently being reviewed by another admin',
          code: 'PAYMENT_LOCKED',
          lockedBy: payment.verificationLockedBy,
          lockedAt: payment.verificationLockedAt,
        });
      }
    }

    // Update payment verification status with atomic check
    const updated = await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        verificationStatus: { in: ['PENDING', 'LOCKED'] }, // Only update if still pending or locked
      },
      data: {
        verificationStatus: 'APPROVED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        status: 'COMPLETED',
        verificationLockedBy: null, // Release lock
        verificationLockedAt: null,
      },
    });

    // Check if update was successful (prevents race condition)
    if (updated.count === 0) {
      throw new BadRequestException({
        message: 'Payment verification status has changed. It may have been approved or rejected by another admin.',
        code: 'PAYMENT_STATUS_CHANGED',
      });
    }

    // Confirm booking (this will generate QR code, credit owner wallet, etc.)
    const confirmedBooking = await this.bookingConfirmationService.confirmBooking(
      payment.bookingId,
      payment.gateway as any,
    );

    // Send notification to player
    try {
      await this.notificationsService.sendPushNotification(
        payment.booking.player.id,
        {
          title: payment.booking.player.preferredLanguage === 'ar' 
            ? 'تم الموافقة على الدفع ✅' 
            : 'Payment Approved ✅',
          body: payment.booking.player.preferredLanguage === 'ar'
            ? 'تم التحقق من دفعتك. تم تأكيد الحجز!'
            : 'Your payment has been verified. Booking confirmed!',
          data: {
            type: 'payment_approved',
            bookingId: payment.bookingId,
            paymentId: payment.id,
          },
          priority: 'high',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${(error as Error).message}`);
    }

    this.logger.log(`Payment ${paymentId} approved by admin ${adminId}`);

    return {
      payment: {
        id: payment.id,
        verificationStatus: 'APPROVED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
      booking: confirmedBooking,
    };
  }

  /**
   * Reject payment verification
   */
  async rejectPayment(paymentId: string, adminId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            player: {
              select: {
                id: true,
                preferredLanguage: true,
              },
            },
            timeSlot: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.verificationStatus === 'REJECTED') {
      throw new BadRequestException('Payment already rejected');
    }

    if (payment.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Cannot reject approved payment');
    }

    // Update payment and booking in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update payment verification status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          verificationStatus: 'REJECTED',
          verifiedBy: adminId,
          verifiedAt: new Date(),
          rejectionReason: reason,
          status: 'FAILED',
        },
      });

      // Update booking status to PAYMENT_FAILED
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'PAYMENT_FAILED',
        },
      });

      // Release time slot
      await tx.timeSlot.update({
        where: { id: payment.booking.timeSlotId },
        data: {
          status: 'AVAILABLE',
        },
      });

      // Add booking status history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.bookingId,
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAYMENT_FAILED',
          reason: `Payment verification rejected: ${reason}`,
        },
      });
    });

    // Send notification to player
    try {
      await this.notificationsService.sendPushNotification(
        payment.booking.player.id,
        {
          title: payment.booking.player.preferredLanguage === 'ar'
            ? 'تم رفض الدفع ❌'
            : 'Payment Rejected ❌',
          body: payment.booking.player.preferredLanguage === 'ar'
            ? `تم رفض دفعتك: ${reason}`
            : `Your payment was rejected: ${reason}`,
          data: {
            type: 'payment_rejected',
            bookingId: payment.bookingId,
            paymentId: payment.id,
            reason,
          },
          priority: 'high',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send rejection notification: ${(error as Error).message}`);
    }

    this.logger.log(`Payment ${paymentId} rejected by admin ${adminId}: ${reason}`);

    return {
      payment: {
        id: payment.id,
        verificationStatus: 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
      booking: {
        id: payment.bookingId,
        status: 'PAYMENT_FAILED',
      },
    };
  }

  /**
   * Get payment verification statistics
   */
  async getVerificationStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {
      gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
      screenshotUrl: { not: null },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, verificationStatus: 'PENDING' } }),
      this.prisma.payment.count({ where: { ...where, verificationStatus: 'APPROVED' } }),
      this.prisma.payment.count({ where: { ...where, verificationStatus: 'REJECTED' } }),
    ]);

    // Calculate average verification time for approved payments
    const approvedPayments = await this.prisma.payment.findMany({
      where: {
        ...where,
        verificationStatus: 'APPROVED',
        verifiedAt: { not: null },
      },
      select: {
        createdAt: true,
        verifiedAt: true,
      },
    });

    let averageVerificationTimeMinutes = 0;
    if (approvedPayments.length > 0) {
      const totalMinutes = approvedPayments.reduce((sum, p) => {
        const diff = p.verifiedAt!.getTime() - p.createdAt.getTime();
        return sum + diff / (1000 * 60); // Convert to minutes
      }, 0);
      averageVerificationTimeMinutes = Math.round(totalMinutes / approvedPayments.length);
    }

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      averageVerificationTimeMinutes,
    };
  }
}
