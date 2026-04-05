import { Injectable, Inject, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BookingTimeoutJobData,
  NoShowDetectionJobData,
} from './processors/bookings.processor';
import {
  ReminderNotificationJobData,
  BookingConfirmationJobData,
  CancellationNotificationJobData,
} from './processors/notifications.processor';
import {
  SlotGenerationJobData,
} from './processors/slots.processor';

/**
 * Service for adding jobs to queues
 * Provides a clean interface for other modules to schedule background jobs
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject('BOOKINGS_QUEUE') private readonly bookingsQueue: Queue,
    @Inject('NOTIFICATIONS_QUEUE') private readonly notificationsQueue: Queue,
    @Inject('SLOTS_QUEUE') private readonly slotsQueue: Queue,
  ) {}

  /**
   * Schedule a booking timeout job
   * @param data Booking timeout job data
   * @param delayMs Delay in milliseconds (default: 15 minutes)
   */
  async scheduleBookingTimeout(
    data: BookingTimeoutJobData,
    delayMs: number = 15 * 60 * 1000,
  ): Promise<void> {
    try {
      await this.bookingsQueue.add('timeout', data, {
        delay: delayMs,
        jobId: `timeout-${data.bookingId}`, // Prevent duplicate jobs
      });
      this.logger.log(
        `Scheduled timeout job for booking ${data.bookingId} with ${delayMs}ms delay`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to schedule timeout job for booking ${data.bookingId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Schedule a no-show detection job
   * @param data No-show detection job data
   * @param delayMs Delay in milliseconds
   */
  async scheduleNoShowDetection(
    data: NoShowDetectionJobData,
    delayMs: number,
  ): Promise<void> {
    try {
      await this.bookingsQueue.add('no-show', data, {
        delay: delayMs,
        jobId: `no-show-${data.bookingId}`, // Prevent duplicate jobs
      });
      this.logger.log(
        `Scheduled no-show detection job for booking ${data.bookingId} with ${delayMs}ms delay`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to schedule no-show detection job for booking ${data.bookingId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Schedule a reminder notification job
   * @param data Reminder notification job data
   * @param delayMs Delay in milliseconds (typically 2 hours before booking)
   */
  async scheduleReminderNotification(
    data: ReminderNotificationJobData,
    delayMs: number,
  ): Promise<void> {
    try {
      await this.notificationsQueue.add('reminder', data, {
        delay: delayMs,
        jobId: `reminder-${data.bookingId}`, // Prevent duplicate jobs
      });
      this.logger.log(
        `Scheduled reminder notification for booking ${data.bookingId} with ${delayMs}ms delay`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to schedule reminder notification for booking ${data.bookingId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Send a booking confirmation notification immediately
   * @param data Booking confirmation job data
   */
  async sendBookingConfirmation(
    data: BookingConfirmationJobData,
  ): Promise<void> {
    try {
      await this.notificationsQueue.add('confirmation', data);
      this.logger.log(
        `Queued confirmation notification for booking ${data.bookingId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to queue confirmation notification for booking ${data.bookingId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Send a cancellation notification immediately
   * @param data Cancellation notification job data
   */
  async sendCancellationNotification(
    data: CancellationNotificationJobData,
  ): Promise<void> {
    try {
      await this.notificationsQueue.add('cancellation', data);
      this.logger.log(
        `Queued cancellation notification for booking ${data.bookingId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to queue cancellation notification for booking ${data.bookingId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Schedule a slot generation job
   * @param data Slot generation job data
   */
  async scheduleSlotGeneration(data: SlotGenerationJobData): Promise<void> {
    try {
      await this.slotsQueue.add('generate', data, {
        jobId: `generate-${data.fieldId}-${Date.now()}`,
      });
      this.logger.log(`Scheduled slot generation for field ${data.fieldId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to schedule slot generation for field ${data.fieldId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Schedule a bulk slot generation job
   * @param data Slot generation job data
   */
  async scheduleBulkSlotGeneration(data: SlotGenerationJobData): Promise<void> {
    try {
      await this.slotsQueue.add('bulk-generate', data, {
        jobId: `bulk-generate-${data.fieldId}-${Date.now()}`,
      });
      this.logger.log(
        `Scheduled bulk slot generation for field ${data.fieldId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to schedule bulk slot generation for field ${data.fieldId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Remove a scheduled job by ID
   * @param queueName Queue name
   * @param jobId Job ID
   */
  async removeJob(
    queueName: 'bookings' | 'notifications' | 'slots',
    jobId: string,
  ): Promise<void> {
    try {
      const queue =
        queueName === 'bookings'
          ? this.bookingsQueue
          : queueName === 'notifications'
            ? this.notificationsQueue
            : this.slotsQueue;

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed job ${jobId} from ${queueName} queue`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to remove job ${jobId} from ${queueName} queue: ${message}`,
      );
      throw error;
    }
  }
}
