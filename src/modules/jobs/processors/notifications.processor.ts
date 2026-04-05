import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { QUEUE_NAMES } from '../constants/queue-names';
import { BookingStatus } from '@prisma/client';

/**
 * Job data types for notifications queue
 */
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

/**
 * Processor for notifications queue
 * Handles push notification jobs
 */
@Injectable()
export class NotificationsProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUE_NAMES.NOTIFICATIONS,
      async (job: Job) => {
        this.logger.log(
          `Processing job ${job.id} of type ${job.name} from notifications queue`,
        );

        try {
          switch (job.name) {
            case 'reminder':
              await this.handleReminder(job);
              break;
            case 'confirmation':
              await this.handleConfirmation(job);
              break;
            case 'cancellation':
              await this.handleCancellation(job);
              break;
            default:
              this.logger.warn(`Unknown job type: ${job.name}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Error processing job ${job.id}: ${message}`,
            stack,
          );
          throw error; // Re-throw to trigger retry
        }
      },
      {
        connection: this.redisService.getConnectionOptions(),
        concurrency: 10, // Process up to 10 notification jobs concurrently
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed with error: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Notifications processor initialized');
  }

  /**
   * Handle reminder notification job
   * Sends reminder notifications 2 hours before booking start time
   */
  private async handleReminder(
    job: Job<ReminderNotificationJobData>,
  ): Promise<void> {
    const { bookingId, scheduledStartTime, playerId } = job.data;
    const startTime = Date.now();
    this.logger.log(`Sending reminder for booking ${bookingId}`);

    try {
      // Get the booking to verify it's still confirmed
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          field: {
            select: {
              name: true,
              address: true,
            },
          },
          player: {
            select: {
              id: true,
              email: true,
              preferredLanguage: true,
            },
          },
        },
      });

      if (!booking) {
        this.logger.warn(
          `Booking ${bookingId} not found, skipping reminder`,
        );
        return;
      }

      // Only send reminder if booking is still confirmed
      if (booking.status !== BookingStatus.CONFIRMED) {
        this.logger.log(
          `Booking ${bookingId} is not confirmed (status: ${booking.status}), skipping reminder`,
        );
        return;
      }

      // Send reminder notification
      const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
      await this.notificationsService.sendReminderNotification(
        playerId,
        booking.field.name,
        formattedDate,
        booking.field.address,
        booking.player.preferredLanguage || 'en',
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully sent reminder for booking ${bookingId} (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send reminder for booking ${bookingId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  /**
   * Cron job that runs every hour to send reminder notifications
   * Queries CONFIRMED bookings starting in 2 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processReminderNotifications(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting reminder notifications check');

    try {
      const now = new Date();
      
      // Calculate time window: 2 hours from now (with 5-minute buffer on each side)
      const reminderTimeStart = new Date(now.getTime() + (2 * 60 - 5) * 60 * 1000); // 1h 55m from now
      const reminderTimeEnd = new Date(now.getTime() + (2 * 60 + 5) * 60 * 1000); // 2h 5m from now

      // Find all CONFIRMED bookings starting in approximately 2 hours
      const upcomingBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          scheduledDate: {
            gte: now,
          },
        },
        select: {
          id: true,
          scheduledDate: true,
          scheduledStartTime: true,
          playerId: true,
        },
      });

      if (upcomingBookings.length === 0) {
        this.logger.log('No upcoming bookings found');
        return;
      }

      // Filter bookings that start in approximately 2 hours
      const bookingsNeedingReminder = upcomingBookings.filter((booking) => {
        const scheduledDateTime = new Date(booking.scheduledDate);
        const [hours, minutes, seconds] = booking.scheduledStartTime
          .toString()
          .split(':')
          .map(Number);
        scheduledDateTime.setHours(hours, minutes, seconds || 0);

        return (
          scheduledDateTime >= reminderTimeStart &&
          scheduledDateTime <= reminderTimeEnd
        );
      });

      if (bookingsNeedingReminder.length === 0) {
        this.logger.log('No bookings need reminders at this time');
        return;
      }

      this.logger.log(
        `Found ${bookingsNeedingReminder.length} bookings needing reminders`,
      );

      // Send reminder for each booking
      let successCount = 0;
      let failureCount = 0;

      for (const booking of bookingsNeedingReminder) {
        try {
          // Get full booking details with field and player info
          const fullBooking = await this.prisma.booking.findUnique({
            where: { id: booking.id },
            include: {
              field: {
                select: {
                  name: true,
                  address: true,
                },
              },
              player: {
                select: {
                  preferredLanguage: true,
                },
              },
            },
          });

          if (fullBooking) {
            const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
            await this.notificationsService.sendReminderNotification(
              booking.playerId,
              fullBooking.field.name,
              formattedDate,
              fullBooking.field.address,
              fullBooking.player.preferredLanguage || 'en',
            );
          }
          
          successCount++;
        } catch (error) {
          failureCount++;
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to send reminder for booking ${booking.id}: ${message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Reminder notifications completed: ${successCount} sent, ${failureCount} failed (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during reminder notifications check: ${message}`,
        stack,
      );
    }
  }

  /**
   * Handle booking confirmation notification
   * Sends notifications to player and field owner when booking is confirmed
   */
  private async handleConfirmation(
    job: Job<BookingConfirmationJobData>,
  ): Promise<void> {
    const { bookingId, playerId, fieldOwnerId } = job.data;
    const startTime = Date.now();
    this.logger.log(`Sending confirmation for booking ${bookingId}`);

    try {
      // Get booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          field: {
            select: {
              name: true,
            },
          },
          player: {
            select: {
              email: true,
              preferredLanguage: true,
            },
          },
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found, skipping confirmation`);
        return;
      }

      // Get field owner details
      const fieldOwner = await this.prisma.user.findUnique({
        where: { id: fieldOwnerId },
        select: { preferredLanguage: true },
      });

      const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();

      // Send notification to player
      await this.notificationsService.sendBookingConfirmationNotification(
        playerId,
        booking.field.name,
        formattedDate,
        booking.player.preferredLanguage || 'en',
      );

      // Send notification to field owner
      await this.notificationsService.sendNewBookingNotification(
        fieldOwnerId,
        booking.field.name,
        formattedDate,
        booking.player.email,
        fieldOwner?.preferredLanguage || 'en',
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully sent confirmation notifications for booking ${bookingId} (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send confirmation for booking ${bookingId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  /**
   * Handle cancellation notification
   * Sends notifications to player and field owner when booking is cancelled
   */
  private async handleCancellation(
    job: Job<CancellationNotificationJobData>,
  ): Promise<void> {
    const { bookingId, playerId, fieldOwnerId, cancelledBy } = job.data;
    const startTime = Date.now();
    this.logger.log(`Sending cancellation notification for booking ${bookingId}`);

    try {
      // Get booking details
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          field: {
            select: {
              name: true,
            },
          },
          player: {
            select: {
              preferredLanguage: true,
            },
          },
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found, skipping cancellation notification`);
        return;
      }

      // Get field owner details
      const fieldOwner = await this.prisma.user.findUnique({
        where: { id: fieldOwnerId },
        select: { preferredLanguage: true },
      });

      const formattedDate = new Date(booking.scheduledDate).toLocaleDateString();
      const refundAmount = booking.refundAmount ? booking.refundAmount.toString() : '0';

      // Send notification to player
      await this.notificationsService.sendCancellationNotification(
        playerId,
        booking.field.name,
        formattedDate,
        refundAmount,
        booking.player.preferredLanguage || 'en',
      );

      // Optionally notify field owner if cancelled by player
      if (cancelledBy === 'player') {
        await this.notificationsService.sendPushNotification(
          fieldOwnerId,
          {
            title: 'Booking Cancelled',
            body: `A booking for ${booking.field.name} on ${formattedDate} has been cancelled by the player.`,
            data: {
              type: 'booking_cancelled_by_player',
              bookingId,
              fieldName: booking.field.name,
              date: formattedDate,
            },
            priority: 'normal',
          },
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully sent cancellation notifications for booking ${bookingId} (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send cancellation notification for booking ${bookingId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Notifications processor shut down');
    }
  }
}
