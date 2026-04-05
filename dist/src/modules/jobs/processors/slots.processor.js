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
var SlotsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotsProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const schedule_1 = require("@nestjs/schedule");
const redis_service_1 = require("../../redis/redis.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const queue_names_1 = require("../constants/queue-names");
const client_1 = require("@prisma/client");
let SlotsProcessor = SlotsProcessor_1 = class SlotsProcessor {
    constructor(redisService, prisma) {
        this.redisService = redisService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(SlotsProcessor_1.name);
    }
    onModuleInit() {
        this.worker = new bullmq_1.Worker(queue_names_1.QUEUE_NAMES.SLOTS, async (job) => {
            this.logger.log(`Processing job ${job.id} of type ${job.name} from slots queue`);
            try {
                switch (job.name) {
                    case 'generate':
                        await this.handleGeneration(job);
                        break;
                    case 'bulk-generate':
                        await this.handleBulkGeneration(job);
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
            concurrency: 3,
        });
        this.worker.on('completed', (job) => {
            this.logger.log(`Job ${job.id} completed successfully`);
        });
        this.worker.on('failed', (job, err) => {
            this.logger.error(`Job ${job?.id} failed with error: ${err.message}`, err.stack);
        });
        this.logger.log('Slots processor initialized');
    }
    async handleGeneration(job) {
        const { fieldId, schedule } = job.data;
        const startTime = Date.now();
        this.logger.log(`Generating slots for field ${fieldId}`);
        try {
            const { daysOfWeek, startTime: slotStartTime, endTime: slotEndTime, slotDuration, price, startDate, endDate } = schedule;
            const datesToGenerate = [];
            const currentDate = new Date(startDate);
            const end = new Date(endDate);
            while (currentDate <= end) {
                const dayOfWeek = currentDate.getDay();
                if (daysOfWeek.includes(dayOfWeek)) {
                    datesToGenerate.push(new Date(currentDate));
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if (datesToGenerate.length === 0) {
                this.logger.warn(`No dates to generate for field ${fieldId}`);
                return;
            }
            const slotsToCreate = [];
            for (const date of datesToGenerate) {
                const [startHours, startMinutes] = slotStartTime.split(':').map(Number);
                const [endHours, endMinutes] = slotEndTime.split(':').map(Number);
                let currentSlotStart = startHours * 60 + startMinutes;
                const dayEnd = endHours * 60 + endMinutes;
                while (currentSlotStart + slotDuration <= dayEnd) {
                    const slotStartHours = Math.floor(currentSlotStart / 60);
                    const slotStartMinutes = currentSlotStart % 60;
                    const slotEndMinutes = currentSlotStart + slotDuration;
                    const slotEndHours = Math.floor(slotEndMinutes / 60);
                    const slotEndMins = slotEndMinutes % 60;
                    slotsToCreate.push({
                        fieldId,
                        date: date,
                        startTime: new Date(`1970-01-01T${slotStartHours.toString().padStart(2, '0')}:${slotStartMinutes.toString().padStart(2, '0')}:00`),
                        endTime: new Date(`1970-01-01T${slotEndHours.toString().padStart(2, '0')}:${slotEndMins.toString().padStart(2, '0')}:00`),
                        price,
                        status: client_1.SlotStatus.AVAILABLE,
                    });
                    currentSlotStart += slotDuration;
                }
            }
            const result = await this.prisma.$transaction(async (tx) => {
                let createdCount = 0;
                let skippedCount = 0;
                for (const slot of slotsToCreate) {
                    const existingSlot = await tx.timeSlot.findFirst({
                        where: {
                            fieldId: slot.fieldId,
                            date: slot.date,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                        },
                    });
                    if (existingSlot) {
                        skippedCount++;
                        continue;
                    }
                    await tx.timeSlot.create({
                        data: slot,
                    });
                    createdCount++;
                }
                return { createdCount, skippedCount };
            });
            const duration = Date.now() - startTime;
            this.logger.log(`Slot generation completed for field ${fieldId}: ${result.createdCount} created, ${result.skippedCount} skipped (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to generate slots for field ${fieldId}: ${message}`, stack);
            throw error;
        }
    }
    async handleBulkGeneration(job) {
        const { fieldId, schedule } = job.data;
        this.logger.log(`Bulk generating slots for field ${fieldId}`);
        await this.handleGeneration(job);
    }
    async processRecurringSlotGeneration() {
        const startTime = Date.now();
        this.logger.log('Starting recurring slot generation');
        try {
            const fields = await this.prisma.field.findMany({
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                },
            });
            if (fields.length === 0) {
                this.logger.log('No fields found for slot generation');
                return;
            }
            this.logger.log(`Found ${fields.length} fields to check for recurring schedules`);
            const duration = Date.now() - startTime;
            this.logger.log(`Recurring slot generation check completed (duration: ${duration}ms)`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error during recurring slot generation: ${message}`, stack);
        }
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
            this.logger.log('Slots processor shut down');
        }
    }
};
exports.SlotsProcessor = SlotsProcessor;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SlotsProcessor.prototype, "processRecurringSlotGeneration", null);
exports.SlotsProcessor = SlotsProcessor = SlotsProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService])
], SlotsProcessor);
//# sourceMappingURL=slots.processor.js.map