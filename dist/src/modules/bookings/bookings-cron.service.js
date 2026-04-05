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
var BookingsCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let BookingsCronService = BookingsCronService_1 = class BookingsCronService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(BookingsCronService_1.name);
    }
    async expireUnpaidBookings() {
        const now = new Date();
        const expired = await this.prisma.booking.findMany({
            where: {
                status: client_1.BookingStatus.PENDING_PAYMENT,
                paymentDeadline: { lt: now },
            },
            select: { id: true, timeSlotId: true },
        });
        if (!expired.length)
            return;
        this.logger.log(`Expiring ${expired.length} unpaid bookings`);
        for (const booking of expired) {
            await this.prisma.$transaction(async (tx) => {
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: client_1.BookingStatus.PAYMENT_FAILED },
                });
                await tx.bookingStatusHistory.create({
                    data: {
                        bookingId: booking.id,
                        fromStatus: client_1.BookingStatus.PENDING_PAYMENT,
                        toStatus: client_1.BookingStatus.PAYMENT_FAILED,
                        reason: 'Payment deadline expired',
                    },
                });
                await tx.timeSlot.update({
                    where: { id: booking.timeSlotId },
                    data: { status: 'AVAILABLE' },
                });
            });
        }
    }
    async expireNoShowBookings() {
        const now = new Date();
        const bookings = await this.prisma.$queryRaw `
      SELECT b.id FROM "Booking" b
      WHERE b.status = 'CONFIRMED'::"BookingStatus"
        AND (b."scheduledDate"::date + b."scheduledEndTime"::time) < ${now}
    `;
        if (!bookings.length)
            return;
        this.logger.log(`Marking ${bookings.length} bookings as EXPIRED_NO_SHOW`);
        for (const booking of bookings) {
            await this.prisma.$transaction(async (tx) => {
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: 'EXPIRED_NO_SHOW' },
                });
                await tx.bookingStatusHistory.create({
                    data: {
                        bookingId: booking.id,
                        fromStatus: client_1.BookingStatus.CONFIRMED,
                        toStatus: 'EXPIRED_NO_SHOW',
                        reason: 'Booking time passed without QR scan',
                    },
                });
            });
        }
    }
};
exports.BookingsCronService = BookingsCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsCronService.prototype, "expireUnpaidBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsCronService.prototype, "expireNoShowBookings", null);
exports.BookingsCronService = BookingsCronService = BookingsCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingsCronService);
//# sourceMappingURL=bookings-cron.service.js.map