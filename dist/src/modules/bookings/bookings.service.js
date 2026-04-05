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
var BookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const booking_state_machine_1 = require("./booking-state-machine");
const cancellation_policy_service_1 = require("./cancellation-policy.service");
const wallet_service_1 = require("../wallet/wallet.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_2 = require("@prisma/client");
const platform_wallet_service_1 = require("../platform-wallet/platform-wallet.service");
let BookingsService = BookingsService_1 = class BookingsService {
    constructor(prisma, cancellationPolicyService, walletService, notificationsService, platformWalletService) {
        this.prisma = prisma;
        this.cancellationPolicyService = cancellationPolicyService;
        this.walletService = walletService;
        this.notificationsService = notificationsService;
        this.platformWalletService = platformWalletService;
        this.logger = new common_1.Logger(BookingsService_1.name);
    }
    async createBooking(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                suspendedUntil: true,
                isVerified: true,
                email: true,
            },
        });
        if (!user?.isVerified) {
            throw new common_1.BadRequestException({
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
            throw new common_1.BadRequestException(`Your account is suspended until ${user.suspendedUntil.toLocaleDateString()}. You cannot create bookings during suspension.`);
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `
          SELECT * FROM "Wallet"
          WHERE "userId" = ${userId}
          FOR UPDATE
        `;
            const timeSlot = await tx.$queryRaw `
          SELECT * FROM "TimeSlot"
          WHERE id = ${dto.timeSlotId}
          FOR UPDATE
        `;
            if (!timeSlot || timeSlot.length === 0) {
                throw new common_1.NotFoundException('Time slot not found');
            }
            const slot = timeSlot[0];
            if (slot.status !== client_1.SlotStatus.AVAILABLE) {
                throw new common_1.BadRequestException('Time slot is not available');
            }
            const now = new Date();
            const slotDateTime = new Date(slot.date);
            const [hours, minutes, seconds] = slot.startTime
                .toString()
                .split(':')
                .map(Number);
            slotDateTime.setHours(hours, minutes, seconds || 0);
            if (slotDateTime <= now) {
                throw new common_1.BadRequestException('Cannot book past time slots');
            }
            const minimumLeadTimeMs = 30 * 60 * 1000;
            if (slotDateTime.getTime() - now.getTime() < minimumLeadTimeMs) {
                throw new common_1.BadRequestException('Bookings must be made at least 30 minutes in advance');
            }
            const field = await tx.field.findUnique({
                where: { id: slot.fieldId, deletedAt: null },
                select: {
                    id: true,
                    ownerId: true,
                    commissionRate: true,
                },
            });
            if (!field) {
                throw new common_1.NotFoundException('Field not found or has been deleted');
            }
            if (field.ownerId === userId) {
                throw new common_1.BadRequestException('Field owners cannot book their own fields');
            }
            const depositSetting = await tx.appSetting.findUnique({
                where: { key: 'deposit_percentage' },
            });
            const depositPercentage = depositSetting
                ? parseFloat(depositSetting.value)
                : 100;
            if (depositPercentage > 100) {
                throw new common_1.BadRequestException('Deposit percentage cannot exceed 100%');
            }
            if (depositPercentage < 0) {
                throw new common_1.BadRequestException('Deposit percentage cannot be negative');
            }
            let commissionRate = field.commissionRate;
            if (!commissionRate) {
                const globalCommissionSetting = await tx.appSetting.findUnique({
                    where: { key: 'global_commission_rate' },
                });
                commissionRate = globalCommissionSetting
                    ? new client_1.Prisma.Decimal(globalCommissionSetting.value)
                    : new client_1.Prisma.Decimal(10);
            }
            const commissionRateNum = parseFloat(commissionRate.toString());
            if (depositPercentage < commissionRateNum) {
                throw new common_1.BadRequestException(`Cannot create booking: Deposit percentage (${depositPercentage}%) is lower than this field's commission rate (${commissionRateNum}%). Please contact support.`);
            }
            const totalPrice = slot.price;
            const depositAmount = totalPrice
                .mul(depositPercentage)
                .div(100)
                .toDecimalPlaces(2);
            const commissionAmount = totalPrice
                .mul(commissionRate)
                .div(100)
                .toDecimalPlaces(2);
            const ownerRevenue = depositAmount.sub(commissionAmount).toDecimalPlaces(2);
            const finalOwnerRevenue = ownerRevenue.lessThan(0)
                ? new client_1.Prisma.Decimal(0)
                : ownerRevenue;
            const paymentDeadline = new Date(now.getTime() + 15 * 60 * 1000);
            const booking = await tx.booking.create({
                data: {
                    playerId: userId,
                    fieldId: slot.fieldId,
                    timeSlotId: slot.id,
                    status: client_1.BookingStatus.PENDING_PAYMENT,
                    totalPrice,
                    depositAmount,
                    commissionRate: commissionRate,
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
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId: booking.id,
                    fromStatus: null,
                    toStatus: client_1.BookingStatus.PENDING_PAYMENT,
                    reason: 'Booking created',
                },
            });
            await tx.timeSlot.update({
                where: { id: slot.id },
                data: { status: client_1.SlotStatus.BOOKED },
            });
            return booking;
        }, {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000,
        });
    }
    async getBookingById(bookingId, userId) {
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
            throw new common_1.NotFoundException('Booking not found');
        }
        return {
            ...booking,
            remainingAmount: new client_1.Prisma.Decimal(booking.totalPrice.toString())
                .sub(booking.depositAmount.toString())
                .toDecimalPlaces(2),
        };
    }
    async getUserBookings(userId, filters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;
        const where = { playerId: userId };
        if (filters?.statuses?.length) {
            where.status = { in: filters.statuses };
        }
        else if (filters?.status) {
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
                    remainingAmount: new client_1.Prisma.Decimal(b.totalPrice.toString())
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
    async updateBookingStatus(bookingId, newStatus, reason) {
        return this.prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                throw new common_1.NotFoundException('Booking not found');
            }
            (0, booking_state_machine_1.validateTransition)(booking.status, newStatus);
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
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    fromStatus: booking.status,
                    toStatus: newStatus,
                    reason: reason || `Status changed to ${newStatus}`,
                },
            });
            return updatedBooking;
        });
    }
    async confirmBooking(bookingId) {
        return this.updateBookingStatus(bookingId, client_1.BookingStatus.CONFIRMED, 'Payment confirmed');
    }
    async markPaymentFailed(bookingId) {
        return this.prisma.$transaction(async (tx) => {
            const booking = await this.updateBookingStatus(bookingId, client_1.BookingStatus.PAYMENT_FAILED, 'Payment failed');
            await tx.timeSlot.update({
                where: { id: booking.timeSlotId },
                data: { status: client_1.SlotStatus.AVAILABLE },
            });
            return booking;
        });
    }
    async cancelBooking(bookingId, userId, reason) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isVerified: true, email: true },
        });
        if (!user?.isVerified) {
            throw new common_1.BadRequestException({
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
            const [lockedBooking] = await tx.$queryRaw `
        SELECT id, status, "playerId", "timeSlotId", "depositAmount", "scheduledDate",
               "scheduledStartTime", "paymentDeadline"
        FROM "Booking" WHERE id = ${bookingId} FOR UPDATE
      `;
            if (!lockedBooking) {
                throw new common_1.NotFoundException('Booking not found');
            }
            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
                include: { field: { select: { ownerId: true } }, payment: true },
            });
            if (!booking)
                throw new common_1.NotFoundException('Booking not found');
            const isPlayer = booking.playerId === userId;
            const isFieldOwner = booking.field.ownerId === userId;
            if (!isPlayer && !isFieldOwner) {
                throw new common_1.ForbiddenException('Only the player or field owner can cancel this booking');
            }
            if (booking.status !== client_1.BookingStatus.PENDING_PAYMENT &&
                booking.status !== client_1.BookingStatus.CONFIRMED) {
                throw new common_1.BadRequestException(`Cannot cancel booking with status ${booking.status}`);
            }
            let refundCalculation;
            if (isFieldOwner) {
                refundCalculation =
                    this.cancellationPolicyService.calculateFieldOwnerCancellationRefund(parseFloat(booking.depositAmount.toString()));
            }
            else {
                const startTime = new Date(booking.scheduledStartTime);
                const scheduledDateTime = new Date(booking.scheduledDate);
                scheduledDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
                refundCalculation =
                    await this.cancellationPolicyService.calculateRefund(parseFloat(booking.depositAmount.toString()), scheduledDateTime);
            }
            const newStatus = refundCalculation.refundAmount > 0
                ? 'CANCELLED_REFUNDED'
                : 'CANCELLED_NO_REFUND';
            const updatedBooking = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: newStatus,
                    cancelledAt: new Date(),
                    cancelledBy: userId,
                    refundAmount: new client_1.Prisma.Decimal(refundCalculation.refundAmount),
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
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    fromStatus: booking.status,
                    toStatus: newStatus,
                    reason: reason ||
                        `Booking cancelled by ${isFieldOwner ? 'field owner' : 'player'}. Refund: ${refundCalculation.refundPercentage}%`,
                },
            });
            await tx.timeSlot.update({
                where: { id: booking.timeSlotId },
                data: { status: client_1.SlotStatus.AVAILABLE },
            });
            if (refundCalculation.refundAmount > 0 &&
                booking.payment &&
                booking.payment.status === client_1.PaymentStatus.COMPLETED) {
                const depositAmount = Number(booking.depositAmount);
                const commissionAmount = Number(booking.commissionAmount);
                const ownerShare = depositAmount - commissionAmount;
                const refundPercentage = refundCalculation.refundPercentage / 100;
                const platformRefund = commissionAmount * refundPercentage;
                const ownerRefund = ownerShare * refundPercentage;
                await this.walletService.credit(booking.playerId, refundCalculation.refundAmount, client_2.WalletTransactionType.REFUND, `Refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`, bookingId, { actorRole: 'PLAYER', transactionPurpose: 'PLAYER_REFUND' });
                await this.platformWalletService.debit(platformRefund, 'BOOKING_REFUND', bookingId, `Platform refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`, bookingId);
                if (ownerRefund > 0) {
                    await this.walletService.debit(booking.field.ownerId, ownerRefund, client_2.WalletTransactionType.REFUND, `Owner refund for cancelled booking ${bookingId} (${refundCalculation.refundPercentage}%)`, bookingId, { actorRole: 'OWNER', transactionPurpose: 'OWNER_REFUND' });
                }
                await tx.payment.update({
                    where: { id: booking.payment.id },
                    data: { status: 'REFUNDED' },
                });
            }
            try {
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
                await this.notificationsService.sendCancellationNotification(booking.playerId, updatedBooking.field.name, formattedDate, refundAmountStr, player?.preferredLanguage || 'en');
                await this.notificationsService.sendCancellationNotification(booking.field.ownerId, updatedBooking.field.name, formattedDate, refundAmountStr, fieldOwner?.preferredLanguage || 'en');
            }
            catch (error) {
                console.error('Failed to send cancellation notifications:', error);
            }
            return {
                booking: updatedBooking,
                refundAmount: refundCalculation.refundAmount,
                refundPercentage: refundCalculation.refundPercentage,
            };
        });
    }
    async checkInBooking(bookingId, fieldOwnerId) {
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
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.field.ownerId !== fieldOwnerId) {
            throw new common_1.ForbiddenException('Only the field owner can check in this booking');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(booking.scheduledDate);
        bookingDate.setHours(0, 0, 0, 0);
        if (bookingDate.getTime() !== today.getTime()) {
            throw new common_1.BadRequestException('Booking can only be checked in on the scheduled date');
        }
        return this.updateBookingStatus(bookingId, client_1.BookingStatus.CHECKED_IN, 'Player checked in');
    }
    async markNoShow(bookingId, ownerId) {
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
                throw new common_1.NotFoundException('Booking not found');
            }
            if (booking.field.ownerId !== ownerId) {
                throw new common_1.ForbiddenException({
                    en: 'Only the field owner can mark this booking as no-show',
                    ar: 'يمكن لصاحب الملعب فقط تحديد هذا الحجز كعدم حضور',
                });
            }
            const updatedBooking = await this.updateBookingStatus(bookingId, client_1.BookingStatus.NO_SHOW, 'Player did not show up');
            await tx.user.update({
                where: { id: booking.playerId },
                data: {
                    noShowCount: {
                        increment: 1,
                    },
                },
            });
            const player = await tx.user.findUnique({
                where: { id: booking.playerId },
                select: { noShowCount: true, preferredLanguage: true },
            });
            if (player && player.noShowCount >= 3) {
                const suspensionEnd = new Date();
                suspensionEnd.setDate(suspensionEnd.getDate() + 30);
                await tx.user.update({
                    where: { id: booking.playerId },
                    data: {
                        suspendedUntil: suspensionEnd,
                    },
                });
            }
            const commissionAmount = Number(booking.commissionAmount);
            if (commissionAmount > 0) {
                await this.walletService.credit(booking.field.ownerId, commissionAmount, client_2.WalletTransactionType.CREDIT, `No-show compensation for booking ${bookingId} (commission portion)`, bookingId, { actorRole: 'OWNER', transactionPurpose: 'NO_SHOW_COMPENSATION' });
                this.logger.log(`Credited ${commissionAmount} (commission) to owner as no-show compensation for booking ${bookingId}`);
            }
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
                    await this.notificationsService.sendNoShowNotification(booking.playerId, bookingWithField.field.name, player.noShowCount, player.preferredLanguage || 'en');
                }
            }
            catch (error) {
                console.error('Failed to send no-show notification:', error);
            }
            return updatedBooking;
        });
    }
    async completeBooking(bookingId) {
        return this.updateBookingStatus(bookingId, client_1.BookingStatus.COMPLETED, 'Booking completed');
    }
    async getBookingStatusHistory(bookingId) {
        const history = await this.prisma.bookingStatusHistory.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' },
        });
        return history;
    }
    async getOwnerBookings(ownerId, filters) {
        console.log('\n=== getOwnerBookings DEBUG ===');
        console.log('Owner ID:', ownerId);
        console.log('Filters:', filters);
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const offset = (page - 1) * limit;
        let whereConditions = `f."ownerId"::text = $1 AND f."deletedAt" IS NULL`;
        const params = [ownerId];
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
        const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint as count
         FROM "Booking" b
         INNER JOIN "Field" f ON b."fieldId"::text = f.id::text
         WHERE ${whereConditions}`, ...params);
        const total = Number(countResult[0]?.count || 0);
        console.log('📊 Total count:', total);
        console.log('📊 WHERE conditions:', whereConditions);
        console.log('📊 Params:', params);
        const bookings = await this.prisma.$queryRawUnsafe(`SELECT 
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
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, ...params, limit, offset);
        console.log('📦 Bookings found:', bookings.length);
        if (bookings.length > 0) {
            console.log('📦 First booking:', bookings[0]);
        }
        console.log('=== END DEBUG ===\n');
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
            isCheckedIn: booking.status === client_1.BookingStatus.CHECKED_IN || booking.status === client_1.BookingStatus.COMPLETED,
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
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = BookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cancellation_policy_service_1.CancellationPolicyService,
        wallet_service_1.WalletService,
        notifications_service_1.NotificationsService,
        platform_wallet_service_1.PlatformWalletService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map