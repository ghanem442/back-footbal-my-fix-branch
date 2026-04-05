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
var BookingConfirmationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingConfirmationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const qr_service_1 = require("../qr/qr.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
const platform_wallet_service_1 = require("../platform-wallet/platform-wallet.service");
let BookingConfirmationService = BookingConfirmationService_1 = class BookingConfirmationService {
    constructor(prisma, walletService, qrService, notificationsService, platformWalletService) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.qrService = qrService;
        this.notificationsService = notificationsService;
        this.platformWalletService = platformWalletService;
        this.logger = new common_1.Logger(BookingConfirmationService_1.name);
    }
    async confirmBooking(bookingId, gateway) {
        this.logger.log(`Starting booking confirmation for booking ${bookingId}`);
        return this.prisma.$transaction(async (tx) => {
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
            if (booking.status !== client_1.BookingStatus.PENDING_PAYMENT) {
                this.logger.warn(`Booking ${bookingId} is not in PENDING_PAYMENT status. Current status: ${booking.status}`);
                throw new Error(`Booking is not in PENDING_PAYMENT status. Current status: ${booking.status}`);
            }
            const bookingNumber = `BK-${Date.now()}-${bookingId.slice(0, 6).toUpperCase()}`;
            const confirmedBooking = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: client_1.BookingStatus.CONFIRMED,
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
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    fromStatus: client_1.BookingStatus.PENDING_PAYMENT,
                    toStatus: client_1.BookingStatus.CONFIRMED,
                    reason: 'Payment successful',
                },
            });
            this.logger.log(`Booking ${bookingId} status updated to CONFIRMED`);
            const depositAmount = Number(booking.depositAmount);
            const commissionAmount = Number(booking.commissionAmount);
            const netAmount = depositAmount - commissionAmount;
            this.logger.log(`Booking ${bookingId} settlement: Total=${Number(booking.totalPrice)}, Deposit=${depositAmount}, Commission=${commissionAmount}, Platform receives=${depositAmount}, Owner net (display only)=${netAmount}`);
            await this.platformWalletService.credit(depositAmount, 'BOOKING_DEPOSIT', bookingId, `Booking deposit for ${bookingId} (Total: ${Number(booking.totalPrice)}, Deposit: ${depositAmount}, Commission: ${commissionAmount})`, bookingId);
            this.logger.log(`Credited ${depositAmount} to platform wallet for booking ${bookingId}`);
            const ownerShare = netAmount;
            if (ownerShare > 0) {
                await this.walletService.credit(booking.field.ownerId, ownerShare, client_1.WalletTransactionType.BOOKING_PAYMENT, `Owner share for booking ${bookingId} (Deposit: ${depositAmount}, Commission: ${commissionAmount})`, bookingId, { actorRole: 'OWNER', transactionPurpose: 'OWNER_ONLINE_SHARE' });
                this.logger.log(`Credited ${ownerShare} to owner wallet (${booking.field.ownerId}) for booking ${bookingId}`);
            }
            else {
                this.logger.log(`No owner share to credit for booking ${bookingId} (deposit equals commission)`);
            }
            await tx.revenue.create({
                data: {
                    bookingId,
                    fieldId: booking.field.id,
                    fieldOwnerId: booking.field.ownerId,
                    gateway,
                    amount: new client_1.Prisma.Decimal(depositAmount),
                    commissionAmount: new client_1.Prisma.Decimal(commissionAmount),
                    ownerRevenue: new client_1.Prisma.Decimal(netAmount),
                },
            });
            this.logger.log(`Recorded revenue for booking ${bookingId}: Deposit=${depositAmount}, Platform Commission=${commissionAmount}, Field Owner Wallet=${netAmount}`);
            try {
                const qrCode = await this.qrService.generateQrCodeForBooking(bookingId);
                this.logger.log(`QR code generated for booking ${bookingId}: ${qrCode.imageUrl}`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to generate QR code for booking ${bookingId}: ${errorMessage}`);
            }
            try {
                const player = await tx.user.findUnique({
                    where: { id: booking.player.id },
                    select: { preferredLanguage: true, email: true },
                });
                const fieldOwner = await tx.user.findUnique({
                    where: { id: booking.field.ownerId },
                    select: { preferredLanguage: true },
                });
                const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
                await this.notificationsService.sendBookingConfirmationNotification(booking.player.id, booking.field.name, formattedDate, player?.preferredLanguage || 'en');
                this.logger.log(`Sent confirmation notification to player ${booking.player.id}`);
                await this.notificationsService.sendNewBookingNotification(booking.field.ownerId, booking.field.name, formattedDate, player?.email || 'Player', fieldOwner?.preferredLanguage || 'en');
                this.logger.log(`Sent new booking notification to field owner ${booking.field.ownerId}`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to send confirmation notification for booking ${bookingId}: ${errorMessage}`);
            }
            this.logger.log(`Booking confirmation completed for ${bookingId}`);
            return confirmedBooking;
        }, {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
        });
    }
    async handlePaymentFailure(bookingId, failureReason) {
        this.logger.log(`Handling payment failure for booking ${bookingId}`);
        return this.prisma.$transaction(async (tx) => {
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
            const updatedBooking = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: client_1.BookingStatus.PAYMENT_FAILED,
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
            await tx.bookingStatusHistory.create({
                data: {
                    bookingId,
                    fromStatus: client_1.BookingStatus.PENDING_PAYMENT,
                    toStatus: client_1.BookingStatus.PAYMENT_FAILED,
                    reason: failureReason || 'Payment failed',
                },
            });
            this.logger.log(`Booking ${bookingId} status updated to PAYMENT_FAILED. Reason: ${failureReason || 'Payment failed'}`);
            await tx.timeSlot.update({
                where: { id: booking.timeSlotId },
                data: {
                    status: 'AVAILABLE',
                },
            });
            this.logger.log(`Time slot ${booking.timeSlotId} released and set to AVAILABLE`);
            try {
                const player = await tx.user.findUnique({
                    where: { id: booking.player.id },
                    select: { preferredLanguage: true },
                });
                await this.notificationsService.sendPushNotification(booking.player.id, {
                    title: 'Payment Failed',
                    body: `Your payment for ${booking.field.name} has failed. Please try again.`,
                    data: {
                        type: 'payment_failed',
                        bookingId: booking.id,
                        fieldName: booking.field.name,
                    },
                    priority: 'high',
                });
                this.logger.log(`Sent payment failure notification to player ${booking.player.id}`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to send payment failure notification: ${errorMessage}`);
            }
            this.logger.log(`Payment failure handling completed for ${bookingId}`);
            return updatedBooking;
        }, {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000,
        });
    }
};
exports.BookingConfirmationService = BookingConfirmationService;
exports.BookingConfirmationService = BookingConfirmationService = BookingConfirmationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        qr_service_1.QrService,
        notifications_service_1.NotificationsService,
        platform_wallet_service_1.PlatformWalletService])
], BookingConfirmationService);
//# sourceMappingURL=booking-confirmation.service.js.map