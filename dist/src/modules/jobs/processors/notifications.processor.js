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
var NotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const schedule_1 = require("@nestjs/schedule");
const redis_service_1 = require("../../redis/redis.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const queue_names_1 = require("../constants/queue-names");
const client_1 = require("@prisma/client");
let NotificationsProcessor = NotificationsProcessor_1 = class NotificationsProcessor {
    constructor(redisService, prisma, notificationsService) {
        this.redisService = redisService;
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(NotificationsProcessor_1.name);
    }
    onModuleInit() {
        this.worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.NOTIFICATIONS, async (job) => {
            this.logger.log(`Processing job ${job.id} of type ${job.name} from notifications queue`);
            try {
                switch (job.name) {
                    case 'reminder':
                        await this.handleReminder(job);
                        break;
                    case 'confirmation':
                        await this.handleConfirmation(job);
                        break;
                    case 'cancellation':
                        await this.handleCancellation(job);
                        break;
                    default:
                        this.logger.warn(`Unknown job type: ${job.name}`);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                const stack = error instanceof Error ? error.stack : undefined;
                this.logger.error(`Error processing job ${job.id}: ${message}`, stack);
                throw error;
            }
        }, {
            connection: this.redisService.getConnectionOptions(),
            concurrency: 10,
        });
        this.worker.on('completed', (job) => {
            this.logger.log(`Job ${job.id} completed successfully`);
        });
        this.worker.on('failed', (job, err) => {
            this.logger.error(`Job ${job?.id} failed with error: ${err.message}`, err.stack);
        });
        this.logger.log('Notifications processor initialized');
    }
    async handleReminder(job) {
        const { bookingId, scheduledStartTime, playerId } = job.data;
        const startTime = Date.now();
        this.logger.log(`Sending reminder for booking ${bookingId}`);
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    field: {
                        select: {
                            name: true,
                            address: true,
                        },
                    },
                    player: {
                        select: {
                            id: true,
                            email: true,
                            preferredLanguage: true,
                        },
                    },
                },
            });
            if (!booking) {
                this.logger.warn(`Booking ${bookingId} not found, skipping reminder`);
                return;
            }
            if (booking.status !== client_1.BookingStatus.CONFIRMED) {
                this.logger.log(`Booking ${bookingId} is not confirmed (status: ${booking.status}), skipping reminder`);
                return;
            }
            const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
            await this.notificationsService.sendReminderNotification(playerId, booking.field.name, formattedDate, booking.field.address, booking.player.preferredLanguage || 'en');
            const duration = Date.now() - startTime;
            this.logger.log(`Successfully sent reminder for booking ${bookingId} (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to send reminder for booking ${bookingId}: ${message}`, stack);
            throw error;
        }
    }
    async processReminderNotifications() {
        const startTime = Date.now();
        this.logger.log('Starting reminder notifications check');
        try {
            const now = new Date();
            const reminderTimeStart = new Date(now.getTime() + (2 * 60 - 5) * 60 * 1000);
            const reminderTimeEnd = new Date(now.getTime() + (2 * 60 + 5) * 60 * 1000);
            const upcomingBookings = await this.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.CONFIRMED,
                    scheduledDate: {
                        gte: now,
                    },
                },
                select: {
                    id: true,
                    scheduledDate: true,
                    scheduledStartTime: true,
                    playerId: true,
                },
            });
            if (upcomingBookings.length === 0) {
                this.logger.log('No upcoming bookings found');
                return;
            }
            const bookingsNeedingReminder = upcomingBookings.filter((booking) => {
                const scheduledDateTime = new Date(booking.scheduledDate);
                const [hours, minutes, seconds] = booking.scheduledStartTime
                    .toString()
                    .split(':')
                    .map(Number);
                scheduledDateTime.setHours(hours, minutes, seconds || 0);
                return (scheduledDateTime >= reminderTimeStart &&
                    scheduledDateTime <= reminderTimeEnd);
            });
            if (bookingsNeedingReminder.length === 0) {
                this.logger.log('No bookings need reminders at this time');
                return;
            }
            this.logger.log(`Found ${bookingsNeedingReminder.length} bookings needing reminders`);
            let successCount = 0;
            let failureCount = 0;
            for (const booking of bookingsNeedingReminder) {
                try {
                    const fullBooking = await this.prisma.booking.findUnique({
                        where: { id: booking.id },
                        include: {
                            field: {
                                select: {
                                    name: true,
                                    address: true,
                                },
                            },
                            player: {
                                select: {
                                    preferredLanguage: true,
                                },
                            },
                        },
                    });
                    if (fullBooking) {
                        const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
                        await this.notificationsService.sendReminderNotification(booking.playerId, fullBooking.field.name, formattedDate, fullBooking.field.address, fullBooking.player.preferredLanguage || 'en');
                    }
                    successCount++;
                }
                catch (error) {
                    failureCount++;
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.error(`Failed to send reminder for booking ${booking.id}: ${message}`);
                }
            }
            const duration = Date.now() - startTime;
            this.logger.log(`Reminder notifications completed: ${successCount} sent, ${failureCount} failed (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error during reminder notifications check: ${message}`, stack);
        }
    }
    async handleConfirmation(job) {
        const { bookingId, playerId, fieldOwnerId } = job.data;
        const startTime = Date.now();
        this.logger.log(`Sending confirmation for booking ${bookingId}`);
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    field: {
                        select: {
                            name: true,
                        },
                    },
                    player: {
                        select: {
                            email: true,
                            preferredLanguage: true,
                        },
                    },
                },
            });
            if (!booking) {
                this.logger.warn(`Booking ${bookingId} not found, skipping confirmation`);
                return;
            }
            const fieldOwner = await this.prisma.user.findUnique({
                where: { id: fieldOwnerId },
                select: { preferredLanguage: true },
            });
            const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
            await this.notificationsService.sendBookingConfirmationNotification(playerId, booking.field.name, formattedDate, booking.player.preferredLanguage || 'en');
            await this.notificationsService.sendNewBookingNotification(fieldOwnerId, booking.field.name, formattedDate, booking.player.email, fieldOwner?.preferredLanguage || 'en');
            const duration = Date.now() - startTime;
            this.logger.log(`Successfully sent confirmation notifications for booking ${bookingId} (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to send confirmation for booking ${bookingId}: ${message}`, stack);
            throw error;
        }
    }
    async handleCancellation(job) {
        const { bookingId, playerId, fieldOwnerId, cancelledBy } = job.data;
        const startTime = Date.now();
        this.logger.log(`Sending cancellation notification for booking ${bookingId}`);
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    field: {
                        select: {
                            name: true,
                        },
                    },
                    player: {
                        select: {
                            preferredLanguage: true,
                        },
                    },
                },
            });
            if (!booking) {
                this.logger.warn(`Booking ${bookingId} not found, skipping cancellation notification`);
                return;
            }
            const fieldOwner = await this.prisma.user.findUnique({
                where: { id: fieldOwnerId },
                select: { preferredLanguage: true },
            });
            const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
            const refundAmount = booking.refundAmount ? booking.refundAmount.toString() : '0';
            await this.notificationsService.sendCancellationNotification(playerId, booking.field.name, formattedDate, refundAmount, booking.player.preferredLanguage || 'en');
            if (cancelledBy === 'player') {
                await this.notificationsService.sendPushNotification(fieldOwnerId, {
                    title: 'Booking Cancelled',
                    body: `A booking for ${booking.field.name} on ${formattedDate} has been cancelled by the player.`,
                    data: {
                        type: 'booking_cancelled_by_player',
                        bookingId,
                        fieldName: booking.field.name,
                        date: formattedDate,
                    },
                    priority: 'normal',
                });
            }
            const duration = Date.now() - startTime;
            this.logger.log(`Successfully sent cancellation notifications for booking ${bookingId} (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to send cancellation notification for booking ${bookingId}: ${message}`, stack);
            throw error;
        }
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
            this.logger.log('Notifications processor shut down');
        }
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsProcessor.prototype, "processReminderNotifications", null);
exports.NotificationsProcessor = NotificationsProcessor = NotificationsProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], NotificationsProcessor);
//# sourceMappingURL=notifications.processor.js.map