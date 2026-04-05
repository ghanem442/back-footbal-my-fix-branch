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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("bullmq");
const redis_module_1 = require("../redis/redis.module");
const redis_service_1 = require("../redis/redis.service");
const prisma_module_1 = require("../prisma/prisma.module");
const bookings_module_1 = require("../bookings/bookings.module");
const notifications_module_1 = require("../notifications/notifications.module");
const config_module_1 = require("../../config/config.module");
const logger_module_1 = require("../logger/logger.module");
const queue_names_1 = require("./constants/queue-names");
const bookings_processor_1 = require("./processors/bookings.processor");
const notifications_processor_1 = require("./processors/notifications.processor");
const slots_processor_1 = require("./processors/slots.processor");
const jobs_service_1 = require("./jobs.service");
const job_monitoring_service_1 = require("./job-monitoring.service");
let JobsModule = class JobsModule {
    constructor(bookingsQueue, notificationsQueue, slotsQueue) {
        this.bookingsQueue = bookingsQueue;
        this.notificationsQueue = notificationsQueue;
        this.slotsQueue = slotsQueue;
    }
    async onModuleDestroy() {
        await Promise.all([
            this.bookingsQueue.close(),
            this.notificationsQueue.close(),
            this.slotsQueue.close(),
        ]);
        console.log('All job queues closed');
    }
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            redis_module_1.RedisModule,
            prisma_module_1.PrismaModule,
            bookings_module_1.BookingsModule,
            notifications_module_1.NotificationsModule,
            config_module_1.AppConfigModule,
            logger_module_1.LoggerModule,
        ],
        providers: [
            jobs_service_1.JobsService,
            job_monitoring_service_1.JobMonitoringService,
            bookings_processor_1.BookingsProcessor,
            notifications_processor_1.NotificationsProcessor,
            slots_processor_1.SlotsProcessor,
            {
                provide: 'BOOKINGS_QUEUE',
                useFactory: (redisService) => {
                    return new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.BOOKINGS, {
                        connection: redisService.getConnectionOptions(),
                        defaultJobOptions: {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 1000,
                            },
                            removeOnComplete: {
                                count: 100,
                                age: 24 * 3600,
                            },
                            removeOnFail: {
                                count: 500,
                            },
                        },
                    });
                },
                inject: [redis_service_1.RedisService],
            },
            {
                provide: 'NOTIFICATIONS_QUEUE',
                useFactory: (redisService) => {
                    return new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.NOTIFICATIONS, {
                        connection: redisService.getConnectionOptions(),
                        defaultJobOptions: {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 1000,
                            },
                            removeOnComplete: {
                                count: 100,
                                age: 24 * 3600,
                            },
                            removeOnFail: {
                                count: 500,
                            },
                        },
                    });
                },
                inject: [redis_service_1.RedisService],
            },
            {
                provide: 'SLOTS_QUEUE',
                useFactory: (redisService) => {
                    return new bullmq_1.Queue(queue_names_1.QUEUE_NAMES.SLOTS, {
                        connection: redisService.getConnectionOptions(),
                        defaultJobOptions: {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 1000,
                            },
                            removeOnComplete: {
                                count: 100,
                                age: 24 * 3600,
                            },
                            removeOnFail: {
                                count: 500,
                            },
                        },
                    });
                },
                inject: [redis_service_1.RedisService],
            },
        ],
        exports: ['BOOKINGS_QUEUE', 'NOTIFICATIONS_QUEUE', 'SLOTS_QUEUE', jobs_service_1.JobsService, job_monitoring_service_1.JobMonitoringService],
    }),
    __param(0, (0, common_1.Inject)('BOOKINGS_QUEUE')),
    __param(1, (0, common_1.Inject)('NOTIFICATIONS_QUEUE')),
    __param(2, (0, common_1.Inject)('SLOTS_QUEUE')),
    __metadata("design:paramtypes", [bullmq_1.Queue,
        bullmq_1.Queue,
        bullmq_1.Queue])
], JobsModule);
//# sourceMappingURL=jobs.module.js.map