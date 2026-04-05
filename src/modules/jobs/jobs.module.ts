import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppConfigModule } from '../../config/config.module';
import { LoggerModule } from '@modules/logger/logger.module';
import { QUEUE_NAMES } from './constants/queue-names';
import { BookingsProcessor } from './processors/bookings.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { SlotsProcessor } from './processors/slots.processor';
import { JobsService } from './jobs.service';
import { JobMonitoringService } from './job-monitoring.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule,
    PrismaModule,
    BookingsModule,
    NotificationsModule,
    AppConfigModule,
    LoggerModule,
  ],
  providers: [
    JobsService,
    JobMonitoringService,
    BookingsProcessor,
    NotificationsProcessor,
    SlotsProcessor,
    {
      provide: 'BOOKINGS_QUEUE',
      useFactory: (redisService: RedisService) => {
        return new Queue(QUEUE_NAMES.BOOKINGS, {
          connection: redisService.getConnectionOptions(),
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000, // Start with 1 second
            },
            removeOnComplete: {
              count: 100, // Keep last 100 completed jobs
              age: 24 * 3600, // Keep for 24 hours
            },
            removeOnFail: {
              count: 500, // Keep last 500 failed jobs for debugging
            },
          },
        });
      },
      inject: [RedisService],
    },
    {
      provide: 'NOTIFICATIONS_QUEUE',
      useFactory: (redisService: RedisService) => {
        return new Queue(QUEUE_NAMES.NOTIFICATIONS, {
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
      inject: [RedisService],
    },
    {
      provide: 'SLOTS_QUEUE',
      useFactory: (redisService: RedisService) => {
        return new Queue(QUEUE_NAMES.SLOTS, {
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
      inject: [RedisService],
    },
  ],
  exports: ['BOOKINGS_QUEUE', 'NOTIFICATIONS_QUEUE', 'SLOTS_QUEUE', JobsService, JobMonitoringService],
})
export class JobsModule implements OnModuleDestroy {
  constructor(
    @Inject('BOOKINGS_QUEUE') private readonly bookingsQueue: Queue,
    @Inject('NOTIFICATIONS_QUEUE') private readonly notificationsQueue: Queue,
    @Inject('SLOTS_QUEUE') private readonly slotsQueue: Queue,
  ) {}

  async onModuleDestroy() {
    // Close all queues gracefully
    await Promise.all([
      this.bookingsQueue.close(),
      this.notificationsQueue.close(),
      this.slotsQueue.close(),
    ]);
    console.log('All job queues closed');
  }
}
