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
var PaymentVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentVerificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const booking_confirmation_service_1 = require("../bookings/booking-confirmation.service");
const payment_audit_log_service_1 = require("./payment-audit-log.service");
let PaymentVerificationService = PaymentVerificationService_1 = class PaymentVerificationService {
    constructor(prisma, notificationsService, bookingConfirmationService, auditLogService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.bookingConfirmationService = bookingConfirmationService;
        this.auditLogService = auditLogService;
        this.logger = new common_1.Logger(PaymentVerificationService_1.name);
        this.lockTimeoutMinutes = 10;
    }
    async lockPayment(paymentId, adminId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
            const lockAge = Date.now() - (payment.verificationLockedAt?.getTime() || 0);
            const lockAgeMinutes = lockAge / (1000 * 60);
            if (lockAgeMinutes < this.lockTimeoutMinutes) {
                throw new common_1.ConflictException({
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
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                verificationLockedBy: adminId,
                verificationLockedAt: new Date(),
            },
        });
        await this.auditLogService.log({
            paymentId,
            adminId,
            action: 'LOCKED',
            metadata: { lockTimeout: this.lockTimeoutMinutes },
        });
        this.logger.log(`Payment ${paymentId} locked by admin ${adminId}`);
        return { locked: true, expiresIn: this.lockTimeoutMinutes };
    }
    async unlockPayment(paymentId, adminId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
            const lockAge = Date.now() - (payment.verificationLockedAt?.getTime() || 0);
            const lockAgeMinutes = lockAge / (1000 * 60);
            if (lockAgeMinutes < this.lockTimeoutMinutes) {
                throw new common_1.BadRequestException('You cannot unlock a payment locked by another admin');
            }
        }
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                verificationLockedBy: null,
                verificationLockedAt: null,
            },
        });
        await this.auditLogService.log({
            paymentId,
            adminId,
            action: 'UNLOCKED',
        });
        this.logger.log(`Payment ${paymentId} unlocked by admin ${adminId}`);
        return { unlocked: true };
    }
    async getPendingPayments(dto) {
        const { page = 1, limit = 20, paymentMethod, startDate, endDate } = dto;
        const skip = (page - 1) * limit;
        const where = {
            verificationStatus: 'PENDING',
            screenshotUrl: { not: null },
            gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
        };
        if (paymentMethod) {
            where.gateway = paymentMethod;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
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
    async approvePayment(paymentId, adminId) {
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
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.verificationStatus === 'APPROVED') {
            throw new common_1.BadRequestException('Payment already approved');
        }
        if (payment.verificationStatus === 'REJECTED') {
            throw new common_1.BadRequestException('Cannot approve rejected payment');
        }
        if (!payment.screenshotUrl) {
            throw new common_1.BadRequestException('No screenshot uploaded for this payment');
        }
        if (payment.booking.status !== 'PENDING_PAYMENT') {
            throw new common_1.BadRequestException({
                message: `Cannot approve payment for booking with status ${payment.booking.status}. Booking may have expired or been cancelled.`,
                code: 'BOOKING_NOT_PENDING',
                bookingStatus: payment.booking.status,
                bookingId: payment.bookingId,
            });
        }
        if (payment.verificationLockedBy && payment.verificationLockedBy !== adminId) {
            const lockExpiry = new Date(payment.verificationLockedAt);
            lockExpiry.setMinutes(lockExpiry.getMinutes() + 10);
            if (new Date() < lockExpiry) {
                throw new common_1.BadRequestException({
                    message: 'Payment is currently being reviewed by another admin',
                    code: 'PAYMENT_LOCKED',
                    lockedBy: payment.verificationLockedBy,
                    lockedAt: payment.verificationLockedAt,
                });
            }
        }
        const updated = await this.prisma.payment.updateMany({
            where: {
                id: paymentId,
                verificationStatus: { in: ['PENDING', 'LOCKED'] },
            },
            data: {
                verificationStatus: 'APPROVED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                status: 'COMPLETED',
                verificationLockedBy: null,
                verificationLockedAt: null,
            },
        });
        if (updated.count === 0) {
            throw new common_1.BadRequestException({
                message: 'Payment verification status has changed. It may have been approved or rejected by another admin.',
                code: 'PAYMENT_STATUS_CHANGED',
            });
        }
        const confirmedBooking = await this.bookingConfirmationService.confirmBooking(payment.bookingId, payment.gateway);
        try {
            await this.notificationsService.sendPushNotification(payment.booking.player.id, {
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
            });
        }
        catch (error) {
            this.logger.error(`Failed to send approval notification: ${error.message}`);
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
    async rejectPayment(paymentId, adminId, reason) {
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
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.verificationStatus === 'REJECTED') {
            throw new common_1.BadRequestException('Payment already rejected');
        }
        if (payment.verificationStatus === 'APPROVED') {
            throw new common_1.BadRequestException('Cannot reject approved payment');
        }
        await this.prisma.$transaction(async (tx) => {
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
                    reason: `Payment verification rejected: ${reason}`,
                },
            });
        });
        try {
            await this.notificationsService.sendPushNotification(payment.booking.player.id, {
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
            });
        }
        catch (error) {
            this.logger.error(`Failed to send rejection notification: ${error.message}`);
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
    async getVerificationStatistics(startDate, endDate) {
        const where = {
            gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
            screenshotUrl: { not: null },
        };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [total, pending, approved, rejected] = await Promise.all([
            this.prisma.payment.count({ where }),
            this.prisma.payment.count({ where: { ...where, verificationStatus: 'PENDING' } }),
            this.prisma.payment.count({ where: { ...where, verificationStatus: 'APPROVED' } }),
            this.prisma.payment.count({ where: { ...where, verificationStatus: 'REJECTED' } }),
        ]);
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
                const diff = p.verifiedAt.getTime() - p.createdAt.getTime();
                return sum + diff / (1000 * 60);
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
};
exports.PaymentVerificationService = PaymentVerificationService;
exports.PaymentVerificationService = PaymentVerificationService = PaymentVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        booking_confirmation_service_1.BookingConfirmationService,
        payment_audit_log_service_1.PaymentAuditLogService])
], PaymentVerificationService);
//# sourceMappingURL=payment-verification.service.js.map