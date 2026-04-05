"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const prisma_service_1 = require("../prisma/prisma.service");
const i18n_service_1 = require("../i18n/i18n.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(configService, prisma, i18n) {
        this.configService = configService;
        this.prisma = prisma;
        this.i18n = i18n;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async onModuleInit() {
        try {
            const serviceAccountPath = this.configService.get('FIREBASE_SERVICE_ACCOUNT_PATH');
            if (!serviceAccountPath) {
                this.logger.warn('Firebase service account not configured. Push notifications will be disabled.');
                return;
            }
            const raw = fs.readFileSync(serviceAccountPath, 'utf8');
            const serviceAccountJson = JSON.parse(raw);
            if (!admin.apps.length) {
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountJson),
                });
            }
            else {
                this.firebaseApp = admin.app();
            }
            this.logger.log('Firebase Cloud Messaging initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK', error?.message || error);
        }
    }
    async registerDevice(userId, token, deviceId) {
        try {
            const existingToken = await this.prisma.fcmToken.findUnique({
                where: { token },
            });
            if (existingToken) {
                await this.prisma.fcmToken.update({
                    where: { token },
                    data: {
                        userId,
                        deviceId,
                        updatedAt: new Date(),
                    },
                });
            }
            else {
                await this.prisma.fcmToken.create({
                    data: {
                        userId,
                        token,
                        deviceId,
                    },
                });
            }
            this.logger.log(`Device token registered for user ${userId}`);
        }
        catch (error) {
            this.logger.error('Failed to register device token', error);
            throw error;
        }
    }
    async unregisterDevice(token) {
        try {
            await this.prisma.fcmToken.delete({
                where: { token },
            });
            this.logger.log(`Device token unregistered: ${token}`);
        }
        catch (error) {
            this.logger.error('Failed to unregister device token', error);
            throw error;
        }
    }
    async sendPushNotification(userId, notification) {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized. Skipping notification.');
            return;
        }
        try {
            const fcmTokens = await this.prisma.fcmToken.findMany({
                where: { userId },
            });
            if (fcmTokens.length === 0) {
                this.logger.warn(`No FCM tokens found for user ${userId}`);
                return;
            }
            const tokens = fcmTokens.map((t) => t.token);
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: notification.data || {},
                tokens,
                android: {
                    priority: notification.priority || 'high',
                },
                apns: {
                    headers: {
                        'apns-priority': notification.priority === 'high' ? '10' : '5',
                    },
                },
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`Sent notification to user ${userId}: ${response.successCount} successful, ${response.failureCount} failed`);
            if (response.failureCount > 0) {
                await this.removeInvalidTokens(response, tokens);
            }
        }
        catch (error) {
            this.logger.error('Failed to send push notification', error);
        }
    }
    async removeInvalidTokens(response, tokens) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const error = resp.error;
                if (error?.code === 'messaging/invalid-registration-token' ||
                    error?.code === 'messaging/registration-token-not-registered') {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });
        if (invalidTokens.length > 0) {
            await this.prisma.fcmToken.deleteMany({
                where: {
                    token: {
                        in: invalidTokens,
                    },
                },
            });
            this.logger.log(`Removed ${invalidTokens.length} invalid tokens`);
        }
    }
    async sendBookingConfirmationNotification(userId, fieldName, date, preferredLanguage = 'en') {
        const title = await this.i18n.translate('notification.bookingConfirmed.title', {}, preferredLanguage);
        const body = await this.i18n.translate('notification.bookingConfirmed.body', { fieldName, date }, preferredLanguage);
        await this.sendPushNotification(userId, {
            title,
            body,
            data: {
                type: 'booking_confirmed',
                fieldName,
                date,
            },
            priority: 'high',
        });
    }
    async sendNewBookingNotification(ownerId, fieldName, date, playerName, preferredLanguage = 'en') {
        const title = await this.i18n.translate('notification.newBooking.title', {}, preferredLanguage);
        const body = await this.i18n.translate('notification.newBooking.body', { fieldName, date }, preferredLanguage);
        await this.sendPushNotification(ownerId, {
            title,
            body,
            data: {
                type: 'new_booking',
                fieldName,
                date,
                playerName,
            },
            priority: 'high',
        });
    }
    async sendCancellationNotification(userId, fieldName, date, refundAmount, preferredLanguage = 'en') {
        const title = await this.i18n.translate('notification.bookingCancelled.title', {}, preferredLanguage);
        const body = await this.i18n.translate('notification.bookingCancelled.body', { fieldName, date }, preferredLanguage);
        await this.sendPushNotification(userId, {
            title,
            body,
            data: {
                type: 'booking_cancelled',
                fieldName,
                date,
                refundAmount,
            },
            priority: 'high',
        });
    }
    async sendNoShowNotification(userId, fieldName, noShowCount, preferredLanguage = 'en') {
        const title = await this.i18n.translate('notification.noShow.title', {}, preferredLanguage);
        let body = await this.i18n.translate('notification.noShow.body', { fieldName }, preferredLanguage);
        if (noShowCount >= 2) {
            const warningKey = noShowCount === 2
                ? 'notification.noShow.warningOneMore'
                : 'notification.noShow.suspended';
            const warning = await this.i18n.translate(warningKey, {}, preferredLanguage);
            body += ` ${warning}`;
        }
        await this.sendPushNotification(userId, {
            title,
            body,
            data: {
                type: 'no_show',
                fieldName,
                noShowCount: noShowCount.toString(),
            },
            priority: 'high',
        });
    }
    async sendReminderNotification(userId, fieldName, date, location, preferredLanguage = 'en') {
        const title = await this.i18n.translate('notification.bookingReminder.title', {}, preferredLanguage);
        const body = await this.i18n.translate('notification.bookingReminder.body', { fieldName }, preferredLanguage);
        await this.sendPushNotification(userId, {
            title,
            body,
            data: {
                type: 'booking_reminder',
                fieldName,
                date,
                location,
            },
            priority: 'high',
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        i18n_service_1.I18nService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map