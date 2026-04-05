import { OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
export interface ReminderNotificationJobData {
    bookingId: string;
    scheduledStartTime: Date;
    playerId: string;
}
export interface BookingConfirmationJobData {
    bookingId: string;
    playerId: string;
    fieldOwnerId: string;
}
export interface CancellationNotificationJobData {
    bookingId: string;
    playerId: string;
    fieldOwnerId: string;
    cancelledBy: 'player' | 'field_owner';
}
export declare class NotificationsProcessor implements OnModuleInit {
    private readonly redisService;
    private readonly prisma;
    private readonly notificationsService;
    private readonly logger;
    private worker;
    constructor(redisService: RedisService, prisma: PrismaService, notificationsService: NotificationsService);
    onModuleInit(): void;
    private handleReminder;
    processReminderNotifications(): Promise<void>;
    private handleConfirmation;
    private handleCancellation;
    onModuleDestroy(): Promise<void>;
}
