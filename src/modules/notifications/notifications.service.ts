import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp!: admin.app.App;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async onModuleInit() {
    try {
      // ✅ Initialize Firebase Admin SDK from file path
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );

      if (!serviceAccountPath) {
        this.logger.warn(
          'Firebase service account not configured. Push notifications will be disabled.',
        );
        return;
      }

      // ✅ Read JSON file from path
      const raw = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccountJson = JSON.parse(raw);

      // ✅ Prevent double initialization
      if (!admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJson),
        });
      } else {
        this.firebaseApp = admin.app();
      }

      this.logger.log('Firebase Cloud Messaging initialized successfully');
    } catch (error: any) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK',
        error?.message || error,
      );
    }
  }

  /**
   * Register a device token for a user
   */
  async registerDevice(
    userId: string,
    token: string,
    deviceId?: string,
  ): Promise<void> {
    try {
      // Check if token already exists
      const existingToken = await this.prisma.fcmToken.findUnique({
        where: { token },
      });

      if (existingToken) {
        // Update the existing token
        await this.prisma.fcmToken.update({
          where: { token },
          data: {
            userId,
            deviceId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new token
        await this.prisma.fcmToken.create({
          data: {
            userId,
            token,
            deviceId,
          },
        });
      }

      this.logger.log(`Device token registered for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to register device token', error);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice(token: string): Promise<void> {
    try {
      await this.prisma.fcmToken.delete({
        where: { token },
      });

      this.logger.log(`Device token unregistered: ${token}`);
    } catch (error) {
      this.logger.error('Failed to unregister device token', error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendPushNotification(
    userId: string,
    notification: PushNotification,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping notification.');
      return;
    }

    try {
      // Get all FCM tokens for the user
      const fcmTokens = await this.prisma.fcmToken.findMany({
        where: { userId },
      });

      if (fcmTokens.length === 0) {
        this.logger.warn(`No FCM tokens found for user ${userId}`);
        return;
      }

      const tokens = fcmTokens.map((t: { token: string }) => t.token);

      // Send notification to all devices
      const message: admin.messaging.MulticastMessage = {
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

      this.logger.log(
        `Sent notification to user ${userId}: ${response.successCount} successful, ${response.failureCount} failed`,
      );

      // Remove invalid tokens
      if (response.failureCount > 0) {
        await this.removeInvalidTokens(response, tokens);
      }
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }
  }

  /**
   * Remove invalid FCM tokens from database
   */
  private async removeInvalidTokens(
    response: admin.messaging.BatchResponse,
    tokens: string[],
  ): Promise<void> {
    const invalidTokens: string[] = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        // Remove tokens that are invalid or unregistered
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
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

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmationNotification(
    userId: string,
    fieldName: string,
    date: string,
    preferredLanguage: string = 'en',
  ): Promise<void> {
    const title = await this.i18n.translate(
      'notification.bookingConfirmed.title',
      {},
      preferredLanguage,
    );
    const body = await this.i18n.translate(
      'notification.bookingConfirmed.body',
      { fieldName, date },
      preferredLanguage,
    );

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

  /**
   * Send new booking notification to field owner
   */
  async sendNewBookingNotification(
    ownerId: string,
    fieldName: string,
    date: string,
    playerName: string,
    preferredLanguage: string = 'en',
  ): Promise<void> {
    const title = await this.i18n.translate(
      'notification.newBooking.title',
      {},
      preferredLanguage,
    );
    const body = await this.i18n.translate(
      'notification.newBooking.body',
      { fieldName, date },
      preferredLanguage,
    );

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

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(
    userId: string,
    fieldName: string,
    date: string,
    refundAmount: string,
    preferredLanguage: string = 'en',
  ): Promise<void> {
    const title = await this.i18n.translate(
      'notification.bookingCancelled.title',
      {},
      preferredLanguage,
    );
    const body = await this.i18n.translate(
      'notification.bookingCancelled.body',
      { fieldName, date },
      preferredLanguage,
    );

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

  /**
   * Send no-show notification
   */
  async sendNoShowNotification(
    userId: string,
    fieldName: string,
    noShowCount: number,
    preferredLanguage: string = 'en',
  ): Promise<void> {
    const title = await this.i18n.translate(
      'notification.noShow.title',
      {},
      preferredLanguage,
    );
    let body = await this.i18n.translate(
      'notification.noShow.body',
      { fieldName },
      preferredLanguage,
    );

    // Add suspension warning if approaching limit
    if (noShowCount >= 2) {
      const warningKey =
        noShowCount === 2
          ? 'notification.noShow.warningOneMore'
          : 'notification.noShow.suspended';
      const warning = await this.i18n.translate(
        warningKey,
        {},
        preferredLanguage,
      );
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

  /**
   * Send reminder notification
   */
  async sendReminderNotification(
    userId: string,
    fieldName: string,
    date: string,
    location: string,
    preferredLanguage: string = 'en',
  ): Promise<void> {
    const title = await this.i18n.translate(
      'notification.bookingReminder.title',
      {},
      preferredLanguage,
    );
    const body = await this.i18n.translate(
      'notification.bookingReminder.body',
      { fieldName },
      preferredLanguage,
    );

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
}