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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const schedule_1 = require("@nestjs/schedule");
const redis_service_1 = require("../../redis/redis.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const bookings_service_1 = require("../../bookings/bookings.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const job_monitoring_service_1 = require("../job-monitoring.service");
const queue_names_1 = require("../constants/queue-names");
const client_1 = require("@prisma/client");
const logger_service_1 = require("../../logger/logger.service");
let BookingsProcessor = class BookingsProcessor {
    constructor(redisService, prisma, bookingsService, notificationsService, monitoringService, loggerService) {
        this.redisService = redisService;
        this.prisma = prisma;
        this.bookingsService = bookingsService;
        this.notificationsService = notificationsService;
        this.monitoringService = monitoringService;
        this.loggerService = loggerService;
    }
    onModuleInit() {
        this.worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.BOOKINGS, async (job) => {
            this.loggerService.logJobExecution({
                jobId: job.id || 'unknown',
                jobType: `bookings.${job.name}`,
                status: 'started',
                parameters: job.data,
            });
            const startTime = Date.now();
            try {
                switch (job.name) {
                    case 'timeout':
                        await this.handleTimeout(job);
                        break;
                    case 'no-show':
                        await this.handleNoShow(job);
                        break;
                    default:
                        this.loggerService.warn(`Unknown job type: ${job.name}`, 'BookingsProcessor');
                }
                const duration = Date.now() - startTime;
                this.loggerService.logJobExecution({
                    jobId: job.id || 'unknown',
                    jobType: `bookings.${job.name}`,
                    status: 'completed',
                    duration,
                    parameters: job.data,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                const stack = error instanceof Error ? error.stack : undefined;
                const duration = Date.now() - startTime;
                this.loggerService.logJobExecution({
                    jobId: job.id || 'unknown',
                    jobType: `bookings.${job.name}`,
                    status: 'failed',
                    duration,
                    error: message,
                    parameters: job.data,
                });
                this.loggerService.error(`Error processing job ${job.id}: ${message}`, stack, 'BookingsProcessor');
                throw error;
            }
        }, {
            connection: this.redisService.getConnectionOptions(),
            concurrency: 5,
        });
        this.worker.on('completed', (job) => {
            this.loggerService.log(`Job ${job.id} completed successfully`, 'BookingsProcessor');
        });
        this.worker.on('failed', (job, err) => {
            this.loggerService.error(`Job ${job?.id} failed with error: ${err.message}`, err.stack, 'BookingsProcessor');
        });
        this.loggerService.log('Bookings processor initialized', 'BookingsProcessor');
    }
    async handleTimeout(job) {
        const { bookingId, createdAt } = job.data;
        const jobStartTime = Date.now();
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    timeSlot: true,
                },
            });
            if (!booking) {
                this.loggerService.warn(`Booking ${bookingId} not found, skipping timeout`, 'BookingsProcessor');
                return;
            }
            if (booking.status !== client_1.BookingStatus.PENDING_PAYMENT) {
                this.loggerService.log(`Booking ${bookingId} is no longer pending payment (status: ${booking.status}), skipping timeout`, 'BookingsProcessor');
                return;
            }
            const now = new Date();
            if (!booking.paymentDeadline || booking.paymentDeadline > now) {
                this.loggerService.log(`Booking ${bookingId} payment deadline has not passed yet, skipping timeout`, 'BookingsProcessor');
                return;
            }
            await this.bookingsService.markPaymentFailed(bookingId);
            const duration = Date.now() - jobStartTime;
            this.loggerService.log(`Successfully cancelled booking ${bookingId} due to payment timeout`, 'BookingsProcessor', { duration, bookingId });
            await this.monitoringService.logSuccess({
                jobName: 'timeout',
                jobType: 'bookings',
                startTime: new Date(jobStartTime),
                endTime: new Date(),
                duration,
                metadata: { bookingId, createdAt },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            const duration = Date.now() - jobStartTime;
            this.loggerService.error(`Failed to process timeout for booking ${bookingId}: ${message}`, stack, 'BookingsProcessor');
            await this.monitoringService.logFailure({
                jobName: 'timeout',
                jobType: 'bookings',
                startTime: new Date(jobStartTime),
                endTime: new Date(),
                duration,
                errorMessage: message,
                errorStack: stack,
                metadata: { bookingId, createdAt },
            });
            throw error;
        }
    }
    async handleNoShow(job) {
        const { bookingId, scheduledStartTime } = job.data;
        const startTime = Date.now();
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    player: {
                        select: {
                            id: true,
                            noShowCount: true,
                        },
                    },
                    field: {
                        select: {
                            ownerId: true,
                        },
                    },
                },
            });
            if (!booking) {
                this.loggerService.warn(`Booking ${bookingId} not found, skipping no-show detection`, 'BookingsProcessor');
                return;
            }
            if (booking.status !== client_1.BookingStatus.CONFIRMED) {
                this.loggerService.log(`Booking ${bookingId} is not confirmed (status: ${booking.status}), skipping no-show detection`, 'BookingsProcessor');
                return;
            }
            const scheduledDateTime = new Date(booking.scheduledDate);
            const [hours, minutes, seconds] = booking.scheduledStartTime
                .toString()
                .split(':')
                .map(Number);
            scheduledDateTime.setHours(hours, minutes, seconds || 0);
            const noShowThreshold = new Date(scheduledDateTime.getTime() + 30 * 60 * 1000);
            const now = new Date();
            if (now < noShowThreshold) {
                this.loggerService.log(`Booking ${bookingId} no-show threshold not reached yet, skipping`, 'BookingsProcessor');
                return;
            }
            await this.bookingsService.markNoShow(bookingId, booking.field.ownerId);
            const duration = Date.now() - startTime;
            this.loggerService.log(`Successfully marked booking ${bookingId} as no-show`, 'BookingsProcessor', { duration, bookingId });
            try {
                const updatedBooking = await this.prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: {
                        field: {
                            select: {
                                name: true,
                            },
                        },
                        player: {
                            select: {
                                noShowCount: true,
                                preferredLanguage: true,
                            },
                        },
                    },
                });
                if (updatedBooking) {
                    await this.notificationsService.sendNoShowNotification(booking.player.id, updatedBooking.field.name, updatedBooking.player.noShowCount, updatedBooking.player.preferredLanguage || 'en');
                    this.loggerService.log(`Sent no-show notification to player ${booking.player.id}`, 'BookingsProcessor');
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.loggerService.error(`Failed to send no-show notification for booking ${bookingId}: ${message}`, undefined, 'BookingsProcessor');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.loggerService.error(`Failed to process no-show for booking ${bookingId}: ${message}`, stack, 'BookingsProcessor');
            throw error;
        }
    }
    async processNoShowDetection() {
        const startTime = Date.now();
        this.loggerService.log('Starting no-show detection check', 'BookingsProcessor');
        try {
            const now = new Date();
            const cutoffTime = new Date(now.getTime() - 30 * 60 * 1000);
            const potentialNoShows = await this.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.CONFIRMED,
                    scheduledDate: {
                        lte: now,
                    },
                },
                select: {
                    id: true,
                    scheduledDate: true,
                    scheduledStartTime: true,
                    playerId: true,
                    field: {
                        select: {
                            ownerId: true,
                        },
                    },
                },
            });
            if (potentialNoShows.length === 0) {
                this.loggerService.log('No potential no-show bookings found', 'BookingsProcessor');
                return;
            }
            const noShowBookings = potentialNoShows.filter((booking) => {
                const scheduledDateTime = new Date(booking.scheduledDate);
                const [hours, minutes, seconds] = booking.scheduledStartTime
                    .toString()
                    .split(':')
                    .map(Number);
                scheduledDateTime.setHours(hours, minutes, seconds || 0);
                const noShowThreshold = new Date(scheduledDateTime.getTime() + 30 * 60 * 1000);
                return now >= noShowThreshold;
            });
            if (noShowBookings.length === 0) {
                this.loggerService.log('No bookings past no-show threshold', 'BookingsProcessor');
                return;
            }
            this.loggerService.log(`Found ${noShowBookings.length} no-show bookings to process`, 'BookingsProcessor');
            let successCount = 0;
            let failureCount = 0;
            for (const booking of noShowBookings) {
                try {
                    await this.bookingsService.markNoShow(booking.id, booking.field.ownerId);
                    successCount++;
                    this.loggerService.debug(`Marked booking ${booking.id} as no-show`, 'BookingsProcessor');
                    try {
                        const updatedBooking = await this.prisma.booking.findUnique({
                            where: { id: booking.id },
                            include: {
                                field: {
                                    select: {
                                        name: true,
                                    },
                                },
                                player: {
                                    select: {
                                        noShowCount: true,
                                        preferredLanguage: true,
                                    },
                                },
                            },
                        });
                        if (updatedBooking) {
                            await this.notificationsService.sendNoShowNotification(booking.playerId, updatedBooking.field.name, updatedBooking.player.noShowCount, updatedBooking.player.preferredLanguage || 'en');
                        }
                    }
                    catch (notifError) {
                        this.loggerService.error(`Failed to send no-show notification for booking ${booking.id}`, undefined, 'BookingsProcessor');
                    }
                }
                catch (error) {
                    failureCount++;
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.loggerService.error(`Failed to mark booking ${booking.id} as no-show: ${message}`, undefined, 'BookingsProcessor');
                }
            }
            const duration = Date.now() - startTime;
            this.loggerService.log(`No-show detection completed: ${successCount} marked, ${failureCount} failed`, 'BookingsProcessor', { duration, successCount, failureCount });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.loggerService.error(`Error during no-show detection check: ${message}`, stack, 'BookingsProcessor');
        }
    }
    async processExpiredBookings() {
        const startTime = Date.now();
        this.loggerService.log('Starting expired bookings check', 'BookingsProcessor');
        try {
            const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);
            const expiredBookings = await this.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.PENDING_PAYMENT,
                    paymentDeadline: {
                        lte: cutoffTime,
                    },
                },
                select: {
                    id: true,
                    createdAt: true,
                    paymentDeadline: true,
                },
            });
            if (expiredBookings.length === 0) {
                this.loggerService.log('No expired bookings found', 'BookingsProcessor');
                return;
            }
            this.loggerService.log(`Found ${expiredBookings.length} expired bookings to process`, 'BookingsProcessor');
            let successCount = 0;
            let failureCount = 0;
            for (const booking of expiredBookings) {
                try {
                    await this.bookingsService.markPaymentFailed(booking.id);
                    successCount++;
                    this.loggerService.debug(`Cancelled expired booking ${booking.id}`, 'BookingsProcessor', { deadline: booking.paymentDeadline });
                }
                catch (error) {
                    failureCount++;
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.loggerService.error(`Failed to cancel expired booking ${booking.id}: ${message}`, undefined, 'BookingsProcessor');
                }
            }
            const duration = Date.now() - startTime;
            this.loggerService.log(`Expired bookings check completed: ${successCount} cancelled, ${failureCount} failed`, 'BookingsProcessor', { duration, successCount, failureCount });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.loggerService.error(`Error during expired bookings check: ${message}`, stack, 'BookingsProcessor');
        }
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
            this.loggerService.log('Bookings processor shut down', 'BookingsProcessor');
        }
    }
};
exports.BookingsProcessor = BookingsProcessor;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsProcessor.prototype, "processNoShowDetection", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsProcessor.prototype, "processExpiredBookings", null);
exports.BookingsProcessor = BookingsProcessor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService,
        bookings_service_1.BookingsService,
        notifications_service_1.NotificationsService,
        job_monitoring_service_1.JobMonitoringService,
        logger_service_1.LoggerService])
], BookingsProcessor);
//# sourceMappingURL=bookings.processor.js.map