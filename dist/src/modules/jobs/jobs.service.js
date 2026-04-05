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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
let JobsService = JobsService_1 = class JobsService {
    constructor(bookingsQueue, notificationsQueue, slotsQueue) {
        this.bookingsQueue = bookingsQueue;
        this.notificationsQueue = notificationsQueue;
        this.slotsQueue = slotsQueue;
        this.logger = new common_1.Logger(JobsService_1.name);
    }
    async scheduleBookingTimeout(data, delayMs = 15 * 60 * 1000) {
        try {
            await this.bookingsQueue.add('timeout', data, {
                delay: delayMs,
                jobId: `timeout-${data.bookingId}`,
            });
            this.logger.log(`Scheduled timeout job for booking ${data.bookingId} with ${delayMs}ms delay`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to schedule timeout job for booking ${data.bookingId}: ${message}`);
            throw error;
        }
    }
    async scheduleNoShowDetection(data, delayMs) {
        try {
            await this.bookingsQueue.add('no-show', data, {
                delay: delayMs,
                jobId: `no-show-${data.bookingId}`,
            });
            this.logger.log(`Scheduled no-show detection job for booking ${data.bookingId} with ${delayMs}ms delay`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to schedule no-show detection job for booking ${data.bookingId}: ${message}`);
            throw error;
        }
    }
    async scheduleReminderNotification(data, delayMs) {
        try {
            await this.notificationsQueue.add('reminder', data, {
                delay: delayMs,
                jobId: `reminder-${data.bookingId}`,
            });
            this.logger.log(`Scheduled reminder notification for booking ${data.bookingId} with ${delayMs}ms delay`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to schedule reminder notification for booking ${data.bookingId}: ${message}`);
            throw error;
        }
    }
    async sendBookingConfirmation(data) {
        try {
            await this.notificationsQueue.add('confirmation', data);
            this.logger.log(`Queued confirmation notification for booking ${data.bookingId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to queue confirmation notification for booking ${data.bookingId}: ${message}`);
            throw error;
        }
    }
    async sendCancellationNotification(data) {
        try {
            await this.notificationsQueue.add('cancellation', data);
            this.logger.log(`Queued cancellation notification for booking ${data.bookingId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to queue cancellation notification for booking ${data.bookingId}: ${message}`);
            throw error;
        }
    }
    async scheduleSlotGeneration(data) {
        try {
            await this.slotsQueue.add('generate', data, {
                jobId: `generate-${data.fieldId}-${Date.now()}`,
            });
            this.logger.log(`Scheduled slot generation for field ${data.fieldId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to schedule slot generation for field ${data.fieldId}: ${message}`);
            throw error;
        }
    }
    async scheduleBulkSlotGeneration(data) {
        try {
            await this.slotsQueue.add('bulk-generate', data, {
                jobId: `bulk-generate-${data.fieldId}-${Date.now()}`,
            });
            this.logger.log(`Scheduled bulk slot generation for field ${data.fieldId}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to schedule bulk slot generation for field ${data.fieldId}: ${message}`);
            throw error;
        }
    }
    async removeJob(queueName, jobId) {
        try {
            const queue = queueName === 'bookings'
                ? this.bookingsQueue
                : queueName === 'notifications'
                    ? this.notificationsQueue
                    : this.slotsQueue;
            const job = await queue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.log(`Removed job ${jobId} from ${queueName} queue`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to remove job ${jobId} from ${queueName} queue: ${message}`);
            throw error;
        }
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('BOOKINGS_QUEUE')),
    __param(1, (0, common_1.Inject)('NOTIFICATIONS_QUEUE')),
    __param(2, (0, common_1.Inject)('SLOTS_QUEUE')),
    __metadata("design:paramtypes", [bullmq_1.Queue,
        bullmq_1.Queue,
        bullmq_1.Queue])
], JobsService);
//# sourceMappingURL=jobs.service.js.map