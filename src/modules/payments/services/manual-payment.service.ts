import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { StorageService } from '@modules/storage/storage.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { PaymentReferenceService } from './payment-reference.service';
import { FraudDetectionService } from './fraud-detection.service';

@Injectable()
export class ManualPaymentService {
  private readonly logger = new Logger(ManualPaymentService.name);
  private readonly maxFileSize: number;
  private readonly maxUploadAttempts: number;
  private readonly paymentExpiryMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly paymentReferenceService: PaymentReferenceService,
    private readonly fraudDetectionService: FraudDetectionService,
  ) {
    this.maxFileSize = this.configService.get<number>('MANUAL_PAYMENT_SCREENSHOT_MAX_SIZE', 5242880); // 5MB default
    this.maxUploadAttempts = this.configService.get<number>('MANUAL_PAYMENT_MAX_UPLOAD_ATTEMPTS', 3);
    this.paymentExpiryMinutes = this.configService.get<number>('MANUAL_PAYMENT_EXPIRY_MINUTES', 30);
  }

  /**
   * Get payment instructions for manual payment methods
   */
  async getPaymentInstructions(gateway: string) {
    const paymentMethod = gateway.toUpperCase();

    if (!['VODAFONE_CASH', 'INSTAPAY'].includes(paymentMethod)) {
      throw new BadRequestException('Invalid payment method. Only VODAFONE_CASH and INSTAPAY are supported.');
    }

    const account = await this.prisma.paymentAccountSettings.findFirst({
      where: {
        paymentMethod,
        isActive: true,
      },
    });

    if (!account) {
      return {
        gateway: paymentMethod,
        isAvailable: false,
        message: {
          en: `${paymentMethod.replace('_', ' ')} is currently not available`,
          ar: `${paymentMethod.replace('_', ' ')} غير متاح حاليًا`,
        },
      };
    }

    const instructions: Record<string, { en: string; ar: string }> = {
      VODAFONE_CASH: {
        en: 'Transfer the amount to the following Vodafone Cash number, then upload a screenshot of the successful transaction.',
        ar: 'قم بتحويل المبلغ إلى رقم فودافون كاش التالي، ثم قم برفع لقطة شاشة للمعاملة الناجحة.',
      },
      INSTAPAY: {
        en: 'Transfer the amount using InstaPay to the following account, then upload a screenshot of the successful transaction.',
        ar: 'قم بتحويل المبلغ باستخدام إنستاباي إلى الحساب التالي، ثم قم برفع لقطة شاشة للمعاملة الناجحة.',
      },
    };

    const accountDetails: any = {};

    if (paymentMethod === 'VODAFONE_CASH') {
      accountDetails.accountNumber = account.accountNumber;
    } else if (paymentMethod === 'INSTAPAY') {
      accountDetails.accountName = account.accountName;
      accountDetails.mobileNumber = account.mobileNumber;
      if (account.ipn) accountDetails.ipn = account.ipn;
      if (account.bankAccount) accountDetails.bankAccount = account.bankAccount;
    }

    return {
      gateway: paymentMethod,
      isAvailable: true,
      instructions: instructions[paymentMethod],
      accountDetails,
    };
  }

  /**
   * Create payment with reference code and expiry
   */
  async createManualPayment(bookingId: string, gateway: string, amount: number) {
    const referenceCode = this.paymentReferenceService.generateReferenceCode();
    const paymentExpiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        gateway: gateway as any,
        amount,
        currency: 'EGP',
        status: 'PENDING',
        referenceCode,
        paymentExpiresAt,
        verificationStatus: 'PENDING',
      },
    });

    this.logger.log(`Manual payment created: ${payment.id}, Reference: ${referenceCode}`);

    return {
      paymentId: payment.id,
      referenceCode,
      paymentExpiresAt,
      expiryMinutes: this.paymentExpiryMinutes,
    };
  }

  /**
   * Upload payment screenshot with enhanced validation and fraud detection
   */
  async uploadScreenshot(
    paymentId: string,
    userId: string,
    file: Express.Multer.File,
    notes?: string,
    transactionId?: string,
    senderNumber?: string,
  ) {
    // Validate file
    if (!file) {
      throw new BadRequestException('Screenshot file is required');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and PDF files are allowed');
    }

    // Get payment
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
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Validate ownership
    if (payment.booking.playerId !== userId) {
      throw new BadRequestException('You can only upload screenshots for your own payments');
    }

    // Check if payment expired
    if (payment.paymentExpiresAt && new Date() > payment.paymentExpiresAt) {
      await this.expirePayment(paymentId);
      throw new BadRequestException({
        code: 'PAYMENT_EXPIRED',
        message: {
          en: 'Payment deadline has expired. Please create a new booking.',
          ar: 'انتهى الموعد النهائي للدفع. يرجى إنشاء حجز جديد.',
        },
      });
    }

    // Validate payment status
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not in pending status');
    }

    // Validate gateway
    if (!['VODAFONE_CASH', 'INSTAPAY'].includes(payment.gateway)) {
      throw new BadRequestException('Screenshot upload is only available for Vodafone Cash and InstaPay');
    }

    // Check upload attempts limit
    if (payment.uploadAttempts >= this.maxUploadAttempts) {
      throw new BadRequestException({
        code: 'MAX_UPLOAD_ATTEMPTS_EXCEEDED',
        message: {
          en: `Maximum upload attempts (${this.maxUploadAttempts}) exceeded. Please contact support.`,
          ar: `تم تجاوز الحد الأقصى لمحاولات التحميل (${this.maxUploadAttempts}). يرجى الاتصال بالدعم.`,
        },
      });
    }

    // Check if already uploaded and pending
    if (payment.screenshotUrl && payment.verificationStatus === 'PENDING') {
      throw new BadRequestException('Screenshot already uploaded and pending verification');
    }

    if (payment.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Payment already approved');
    }

    // Run fraud detection
    const fraudCheck = await this.fraudDetectionService.analyzeFraudRisk(paymentId, userId);

    // Upload screenshot to storage
    const filename = `payment-screenshots/${paymentId}-${Date.now()}.${file.originalname.split('.').pop()}`;
    const screenshotUrl = await this.storageService.upload(
      file.buffer,
      filename,
      file.mimetype,
    );

    // Update payment
    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        screenshotUrl,
        playerNotes: notes,
        userTransactionId: transactionId,
        userSenderNumber: senderNumber,
        verificationStatus: 'PENDING',
        uploadAttempts: { increment: 1 },
        lastUploadAt: new Date(),
        isFlagged: fraudCheck.shouldAutoFlag,
        flagReason: fraudCheck.shouldAutoFlag
          ? `Auto-flagged: Risk Score ${fraudCheck.riskScore}, Flags: ${fraudCheck.flags.join(', ')}`
          : null,
        updatedAt: new Date(),
      },
    });

    // Send notification to all admins
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, preferredLanguage: true },
      });

      const notificationTitle = (lang: string) =>
        lang === 'ar' ? 'مطلوب التحقق من الدفع' : 'Payment Verification Required';

      const notificationBody = (lang: string) =>
        lang === 'ar'
          ? `تم إرسال لقطة شاشة للدفع للحجز ${payment.booking.bookingNumber || payment.bookingId}`
          : `Payment screenshot submitted for booking ${payment.booking.bookingNumber || payment.bookingId}`;

      for (const admin of admins) {
        await this.notificationsService.sendPushNotification(admin.id, {
          title: notificationTitle(admin.preferredLanguage),
          body: notificationBody(admin.preferredLanguage),
          data: {
            type: 'payment_verification_required',
            paymentId: payment.id,
            bookingId: payment.bookingId,
            amount: payment.amount.toString(),
            gateway: payment.gateway,
            referenceCode: payment.referenceCode || '',
            isFlagged: fraudCheck.shouldAutoFlag.toString(),
            riskScore: fraudCheck.riskScore.toString(),
          },
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${(error as Error).message}`);
    }

    this.logger.log(`Screenshot uploaded for payment ${paymentId}, Attempt: ${updatedPayment.uploadAttempts}`);

    return {
      paymentId: payment.id,
      screenshotUrl,
      verificationStatus: 'PENDING',
      uploadAttempts: updatedPayment.uploadAttempts,
      maxUploadAttempts: this.maxUploadAttempts,
      fraudCheck: fraudCheck.isSuspicious
        ? {
            isSuspicious: true,
            riskScore: fraudCheck.riskScore,
            message: {
              en: 'Your payment has been flagged for additional review. This may take longer to verify.',
              ar: 'تم وضع علامة على دفعتك للمراجعة الإضافية. قد يستغرق التحقق وقتًا أطول.',
            },
          }
        : undefined,
      message: {
        en: 'Screenshot uploaded successfully. Waiting for admin verification.',
        ar: 'تم رفع لقطة الشاشة بنجاح. في انتظار التحقق من المسؤول.',
      },
    };
  }

  /**
   * Get payment verification status
   */
  async getVerificationStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            playerId: true,
            bookingNumber: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Validate ownership
    if (payment.booking.playerId !== userId) {
      throw new BadRequestException('You can only check status for your own payments');
    }

    // Check if expired
    if (
      payment.paymentExpiresAt &&
      new Date() > payment.paymentExpiresAt &&
      payment.verificationStatus === 'PENDING'
    ) {
      await this.expirePayment(paymentId);
      return {
        paymentId: payment.id,
        verificationStatus: 'EXPIRED',
        message: {
          en: 'Payment deadline has expired',
          ar: 'انتهى الموعد النهائي للدفع',
        },
      };
    }

    return {
      paymentId: payment.id,
      referenceCode: payment.referenceCode,
      verificationStatus: payment.verificationStatus,
      screenshotUrl: payment.screenshotUrl,
      submittedAt: payment.lastUploadAt,
      verifiedAt: payment.verifiedAt,
      rejectionReason: payment.rejectionReason,
      paymentExpiresAt: payment.paymentExpiresAt,
      uploadAttempts: payment.uploadAttempts,
      maxUploadAttempts: this.maxUploadAttempts,
      isFlagged: payment.isFlagged,
      estimatedVerificationTime: payment.verificationStatus === 'PENDING' ? '15-30 minutes' : null,
    };
  }

  /**
   * Expire payment and cancel booking
   */
  private async expirePayment(paymentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { include: { timeSlot: true } } },
      });

      if (!payment) return;

      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          verificationStatus: 'EXPIRED',
          status: 'FAILED',
        },
      });

      // Update booking status
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
          reason: 'Payment deadline expired',
        },
      });
    });

    this.logger.log(`Payment ${paymentId} expired`);
  }
}
