"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ManualPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_service_1 = require("../../storage/storage.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const config_1 = require("@nestjs/config");
const payment_reference_service_1 = require("./payment-reference.service");
const fraud_detection_service_1 = require("./fraud-detection.service");
let ManualPaymentService = ManualPaymentService_1 = class ManualPaymentService {
    constructor(prisma, storageService, notificationsService, configService, paymentReferenceService, fraudDetectionService) {
        this.prisma = prisma;
        this.storageService = storageService;
        this.notificationsService = notificationsService;
        this.configService = configService;
        this.paymentReferenceService = paymentReferenceService;
        this.fraudDetectionService = fraudDetectionService;
        this.logger = new common_1.Logger(ManualPaymentService_1.name);
        this.maxFileSize = this.configService.get('MANUAL_PAYMENT_SCREENSHOT_MAX_SIZE', 5242880);
        this.maxUploadAttempts = this.configService.get('MANUAL_PAYMENT_MAX_UPLOAD_ATTEMPTS', 3);
        this.paymentExpiryMinutes = this.configService.get('MANUAL_PAYMENT_EXPIRY_MINUTES', 30);
    }
    async getPaymentInstructions(gateway) {
        const paymentMethod = gateway.toUpperCase();
        if (!['VODAFONE_CASH', 'INSTAPAY'].includes(paymentMethod)) {
            throw new common_1.BadRequestException('Invalid payment method. Only VODAFONE_CASH and INSTAPAY are supported.');
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
        const instructions = {
            VODAFONE_CASH: {
                en: 'Transfer the amount to the following Vodafone Cash number, then upload a screenshot of the successful transaction.',
                ar: 'قم بتحويل المبلغ إلى رقم فودافون كاش التالي، ثم قم برفع لقطة شاشة للمعاملة الناجحة.',
            },
            INSTAPAY: {
                en: 'Transfer the amount using InstaPay to the following account, then upload a screenshot of the successful transaction.',
                ar: 'قم بتحويل المبلغ باستخدام إنستاباي إلى الحساب التالي، ثم قم برفع لقطة شاشة للمعاملة الناجحة.',
            },
        };
        const accountDetails = {};
        if (paymentMethod === 'VODAFONE_CASH') {
            accountDetails.accountNumber = account.accountNumber;
        }
        else if (paymentMethod === 'INSTAPAY') {
            accountDetails.accountName = account.accountName;
            accountDetails.mobileNumber = account.mobileNumber;
            if (account.ipn)
                accountDetails.ipn = account.ipn;
            if (account.bankAccount)
                accountDetails.bankAccount = account.bankAccount;
        }
        return {
            gateway: paymentMethod,
            isAvailable: true,
            instructions: instructions[paymentMethod],
            accountDetails,
        };
    }
    async createManualPayment(bookingId, gateway, amount) {
        const referenceCode = this.paymentReferenceService.generateReferenceCode();
        const paymentExpiresAt = new Date(Date.now() + this.paymentExpiryMinutes * 60 * 1000);
        const payment = await this.prisma.payment.create({
            data: {
                bookingId,
                gateway: gateway,
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
    async uploadScreenshot(paymentId, userId, file, notes, transactionId, senderNumber) {
        if (!file) {
            throw new common_1.BadRequestException('Screenshot file is required');
        }
        if (file.size > this.maxFileSize) {
            throw new common_1.BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
        }
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPG, PNG, and PDF files are allowed');
        }
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
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.booking.playerId !== userId) {
            throw new common_1.BadRequestException('You can only upload screenshots for your own payments');
        }
        if (payment.paymentExpiresAt && new Date() > payment.paymentExpiresAt) {
            await this.expirePayment(paymentId);
            throw new common_1.BadRequestException({
                code: 'PAYMENT_EXPIRED',
                message: {
                    en: 'Payment deadline has expired. Please create a new booking.',
                    ar: 'انتهى الموعد النهائي للدفع. يرجى إنشاء حجز جديد.',
                },
            });
        }
        if (payment.status !== 'PENDING') {
            throw new common_1.BadRequestException('Payment is not in pending status');
        }
        if (!['VODAFONE_CASH', 'INSTAPAY'].includes(payment.gateway)) {
            throw new common_1.BadRequestException('Screenshot upload is only available for Vodafone Cash and InstaPay');
        }
        if (payment.uploadAttempts >= this.maxUploadAttempts) {
            throw new common_1.BadRequestException({
                code: 'MAX_UPLOAD_ATTEMPTS_EXCEEDED',
                message: {
                    en: `Maximum upload attempts (${this.maxUploadAttempts}) exceeded. Please contact support.`,
                    ar: `تم تجاوز الحد الأقصى لمحاولات التحميل (${this.maxUploadAttempts}). يرجى الاتصال بالدعم.`,
                },
            });
        }
        if (payment.screenshotUrl && payment.verificationStatus === 'PENDING') {
            throw new common_1.BadRequestException('Screenshot already uploaded and pending verification');
        }
        if (payment.verificationStatus === 'APPROVED') {
            throw new common_1.BadRequestException('Payment already approved');
        }
        const fraudCheck = await this.fraudDetectionService.analyzeFraudRisk(paymentId, userId);
        const filename = `payment-screenshots/${paymentId}-${Date.now()}.${file.originalname.split('.').pop()}`;
        const screenshotUrl = await this.storageService.upload(file.buffer, filename, file.mimetype);
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
        try {
            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true, preferredLanguage: true },
            });
            const notificationTitle = (lang) => lang === 'ar' ? 'مطلوب التحقق من الدفع' : 'Payment Verification Required';
            const notificationBody = (lang) => lang === 'ar'
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
        }
        catch (error) {
            this.logger.error(`Failed to send admin notification: ${error.message}`);
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
    async getVerificationStatus(paymentId, userId) {
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
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.booking.playerId !== userId) {
            throw new common_1.BadRequestException('You can only check status for your own payments');
        }
        if (payment.paymentExpiresAt &&
            new Date() > payment.paymentExpiresAt &&
            payment.verificationStatus === 'PENDING') {
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
    async expirePayment(paymentId) {
        await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { booking: { include: { timeSlot: true } } },
            });
            if (!payment)
                return;
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    verificationStatus: 'EXPIRED',
                    status: 'FAILED',
                },
            });
            await tx.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'PAYMENT_FAILED',
                },
            });
            await tx.timeSlot.update({
                where: { id: payment.booking.timeSlotId },
                data: {
                    status: 'AVAILABLE',
                },
            });
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
};
exports.ManualPaymentService = ManualPaymentService;
exports.ManualPaymentService = ManualPaymentService = ManualPaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService,
        notifications_service_1.NotificationsService,
        config_1.ConfigService,
        payment_reference_service_1.PaymentReferenceService,
        fraud_detection_service_1.FraudDetectionService])
], ManualPaymentService);
//# sourceMappingURL=manual-payment.service.js.map