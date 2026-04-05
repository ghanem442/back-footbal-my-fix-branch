import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
export interface PushNotification {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'high' | 'normal';
}
export declare class NotificationsService implements OnModuleInit {
    private readonly configService;
    private readonly prisma;
    private readonly i18n;
    private readonly logger;
    private firebaseApp;
    constructor(configService: ConfigService, prisma: PrismaService, i18n: I18nService);
    onModuleInit(): Promise<void>;
    registerDevice(userId: string, token: string, deviceId?: string): Promise<void>;
    unregisterDevice(token: string): Promise<void>;
    sendPushNotification(userId: string, notification: PushNotification): Promise<void>;
    private removeInvalidTokens;
    sendBookingConfirmationNotification(userId: string, fieldName: string, date: string, preferredLanguage?: string): Promise<void>;
    sendNewBookingNotification(ownerId: string, fieldName: string, date: string, playerName: string, preferredLanguage?: string): Promise<void>;
    sendCancellationNotification(userId: string, fieldName: string, date: string, refundAmount: string, preferredLanguage?: string): Promise<void>;
    sendNoShowNotification(userId: string, fieldName: string, noShowCount: number, preferredLanguage?: string): Promise<void>;
    sendReminderNotification(userId: string, fieldName: string, date: string, location: string, preferredLanguage?: string): Promise<void>;
}
