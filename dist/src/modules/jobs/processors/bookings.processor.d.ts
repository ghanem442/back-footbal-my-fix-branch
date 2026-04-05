import { OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../../bookings/bookings.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { JobMonitoringService } from '../job-monitoring.service';
import { LoggerService } from '@modules/logger/logger.service';
export interface BookingTimeoutJobData {
    bookingId: string;
    createdAt: Date;
}
export interface NoShowDetectionJobData {
    bookingId: string;
    scheduledStartTime: Date;
}
export declare class BookingsProcessor implements OnModuleInit {
    private readonly redisService;
    private readonly prisma;
    private readonly bookingsService;
    private readonly notificationsService;
    private readonly monitoringService;
    private readonly loggerService;
    private worker;
    constructor(redisService: RedisService, prisma: PrismaService, bookingsService: BookingsService, notificationsService: NotificationsService, monitoringService: JobMonitoringService, loggerService: LoggerService);
    onModuleInit(): void;
    private handleTimeout;
    private handleNoShow;
    processNoShowDetection(): Promise<void>;
    processExpiredBookings(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
