import { Injectable, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../../bookings/bookings.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { JobMonitoringService } from '../job-monitoring.service';
import { QUEUE_NAMES } from '../constants/queue-names';
import { BookingStatus } from '@prisma/client';
import { LoggerService } from '@modules/logger/logger.service';

/**
 * Job data types for bookings queue
 */
export interface BookingTimeoutJobData {
  bookingId: string;
  createdAt: Date;
}

export interface NoShowDetectionJobData {
  bookingId: string;
  scheduledStartTime: Date;
}

/**
 * Processor for bookings queue
 * Handles booking timeout and no-show detection jobs
 * 
 * Requirements: 25.4
 */
@Injectable()
export class BookingsProcessor implements OnModuleInit {
  private worker!: Worker;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
    private readonly notificationsService: NotificationsService,
    private readonly monitoringService: JobMonitoringService,
    private readonly loggerService: LoggerService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUE_NAMES.BOOKINGS,
      async (job: Job) => {
        // Log job start
        this.loggerService.logJobExecution({
          jobId: job.id || 'unknown',
          jobType: `bookings.${job.name}`,
          status: 'started',
          parameters: job.data,
        });

        const startTime = Date.now();

        try {
          switch (job.name) {
            case 'timeout':
              await this.handleTimeout(job);
              break;
            case 'no-show':
              await this.handleNoShow(job);
              break;
            default:
              this.loggerService.warn(`Unknown job type: ${job.name}`, 'BookingsProcessor');
          }

          // Log job completion
          const duration = Date.now() - startTime;
          this.loggerService.logJobExecution({
            jobId: job.id || 'unknown',
            jobType: `bookings.${job.name}`,
            status: 'completed',
            duration,
            parameters: job.data,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          const stack = error instanceof Error ? error.stack : undefined;
          const duration = Date.now() - startTime;
          
          // Log job failure
          this.loggerService.logJobExecution({
            jobId: job.id || 'unknown',
            jobType: `bookings.${job.name}`,
            status: 'failed',
            duration,
            error: message,
            parameters: job.data,
          });
          
          this.loggerService.error(
            `Error processing job ${job.id}: ${message}`,
            stack,
            'BookingsProcessor',
          );
          throw error; // Re-throw to trigger retry
        }
      },
      {
        connection: this.redisService.getConnectionOptions(),
        concurrency: 5, // Process up to 5 jobs concurrently
      },
    );

    this.worker.on('completed', (job) => {
      this.loggerService.log(`Job ${job.id} completed successfully`, 'BookingsProcessor');
    });

    this.worker.on('failed', (job, err) => {
      this.loggerService.error(
        `Job ${job?.id} failed with error: ${err.message}`,
        err.stack,
        'BookingsProcessor',
      );
    });

    this.loggerService.log('Bookings processor initialized', 'BookingsProcessor');
  }

  /**
   * Handle booking timeout job
   * Cancels bookings that have been in PENDING_PAYMENT status for more than 15 minutes
   */
  private async handleTimeout(job: Job<BookingTimeoutJobData>): Promise<void> {
    const { bookingId, createdAt } = job.data;
    const jobStartTime = Date.now();

    try {
      // Get the booking
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          timeSlot: true,
        },
      });

      if (!booking) {
        this.loggerService.warn(`Booking ${bookingId} not found, skipping timeout`, 'BookingsProcessor');
        return;
      }

      // Check if booking is still in PENDING_PAYMENT status
      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        this.loggerService.log(
          `Booking ${bookingId} is no longer pending payment (status: ${booking.status}), skipping timeout`,
          'BookingsProcessor',
        );
        return;
      }

      // Check if payment deadline has passed
      const now = new Date();
      if (!booking.paymentDeadline || booking.paymentDeadline > now) {
        this.loggerService.log(
          `Booking ${bookingId} payment deadline has not passed yet, skipping timeout`,
          'BookingsProcessor',
        );
        return;
      }

      // Cancel the booking and release the time slot
      await this.bookingsService.markPaymentFailed(bookingId);

      const duration = Date.now() - jobStartTime;
      this.loggerService.log(
        `Successfully cancelled booking ${bookingId} due to payment timeout`,
        'BookingsProcessor',
        { duration, bookingId },
      );

      // Log success
      await this.monitoringService.logSuccess({
        jobName: 'timeout',
        jobType: 'bookings',
        startTime: new Date(jobStartTime),
        endTime: new Date(),
        duration,
        metadata: { bookingId, createdAt },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      const duration = Date.now() - jobStartTime;
      
      this.loggerService.error(
        `Failed to process timeout for booking ${bookingId}: ${message}`,
        stack,
        'BookingsProcessor',
      );

      // Log failure
      await this.monitoringService.logFailure({
        jobName: 'timeout',
        jobType: 'bookings',
        startTime: new Date(jobStartTime),
        endTime: new Date(),
        duration,
        errorMessage: message,
        errorStack: stack,
        metadata: { bookingId, createdAt },
      });

      throw error;
    }
  }

  /**
   * Handle no-show detection job
   * Marks bookings as NO_SHOW when 30 minutes past scheduled start time
   */
  private async handleNoShow(
    job: Job<NoShowDetectionJobData>,
  ): Promise<void> {
    const { bookingId, scheduledStartTime } = job.data;
    const startTime = Date.now();

    try {
      // Get the booking
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          player: {
            select: {
              id: true,
              noShowCount: true,
            },
          },
          field: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (!booking) {
        this.loggerService.warn(
          `Booking ${bookingId} not found, skipping no-show detection`,
          'BookingsProcessor',
        );
        return;
      }

      // Check if booking is still in CONFIRMED status
      if (booking.status !== BookingStatus.CONFIRMED) {
        this.loggerService.log(
          `Booking ${bookingId} is not confirmed (status: ${booking.status}), skipping no-show detection`,
          'BookingsProcessor',
        );
        return;
      }

      // Check if 30 minutes have passed since scheduled start time
      const scheduledDateTime = new Date(booking.scheduledDate);
      const [hours, minutes, seconds] = booking.scheduledStartTime
        .toString()
        .split(':')
        .map(Number);
      scheduledDateTime.setHours(hours, minutes, seconds || 0);

      const noShowThreshold = new Date(
        scheduledDateTime.getTime() + 30 * 60 * 1000,
      );
      const now = new Date();

      if (now < noShowThreshold) {
        this.loggerService.log(
          `Booking ${bookingId} no-show threshold not reached yet, skipping`,
          'BookingsProcessor',
        );
        return;
      }

      // Mark as no-show
      await this.bookingsService.markNoShow(bookingId, booking.field.ownerId);

      const duration = Date.now() - startTime;
      this.loggerService.log(
        `Successfully marked booking ${bookingId} as no-show`,
        'BookingsProcessor',
        { duration, bookingId },
      );

      // Trigger no-show notification
      try {
        // Get updated booking with field details
        const updatedBooking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            field: {
              select: {
                name: true,
              },
            },
            player: {
              select: {
                noShowCount: true,
                preferredLanguage: true,
              },
            },
          },
        });

        if (updatedBooking) {
          await this.notificationsService.sendNoShowNotification(
            booking.player.id,
            updatedBooking.field.name,
            updatedBooking.player.noShowCount,
            updatedBooking.player.preferredLanguage || 'en',
          );

          this.loggerService.log(
            `Sent no-show notification to player ${booking.player.id}`,
            'BookingsProcessor',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.loggerService.error(
          `Failed to send no-show notification for booking ${bookingId}: ${message}`,
          undefined,
          'BookingsProcessor',
        );
        // Don't fail the job if notification fails
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.loggerService.error(
        `Failed to process no-show for booking ${bookingId}: ${message}`,
        stack,
        'BookingsProcessor',
      );
      throw error;
    }
  }

  /**
   * Cron job that runs every hour to check for no-show bookings
   * Queries CONFIRMED bookings past scheduled start time + 30 minutes
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processNoShowDetection(): Promise<void> {
    const startTime = Date.now();
    this.loggerService.log('Starting no-show detection check', 'BookingsProcessor');

    try {
      // Calculate cutoff time (30 minutes ago)
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - 30 * 60 * 1000);

      // Find all CONFIRMED bookings that should have started more than 30 minutes ago
      const potentialNoShows = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          scheduledDate: {
            lte: now,
          },
        },
        select: {
          id: true,
          scheduledDate: true,
          scheduledStartTime: true,
          playerId: true,
          field: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (potentialNoShows.length === 0) {
        this.loggerService.log('No potential no-show bookings found', 'BookingsProcessor');
        return;
      }

      // Filter bookings where scheduled start time + 30 minutes has passed
      const noShowBookings = potentialNoShows.filter((booking) => {
        const scheduledDateTime = new Date(booking.scheduledDate);
        const [hours, minutes, seconds] = booking.scheduledStartTime
          .toString()
          .split(':')
          .map(Number);
        scheduledDateTime.setHours(hours, minutes, seconds || 0);

        const noShowThreshold = new Date(
          scheduledDateTime.getTime() + 30 * 60 * 1000,
        );

        return now >= noShowThreshold;
      });

      if (noShowBookings.length === 0) {
        this.loggerService.log('No bookings past no-show threshold', 'BookingsProcessor');
        return;
      }

      this.loggerService.log(
        `Found ${noShowBookings.length} no-show bookings to process`,
        'BookingsProcessor',
      );

      // Process each no-show booking
      let successCount = 0;
      let failureCount = 0;

      for (const booking of noShowBookings) {
        try {
          await this.bookingsService.markNoShow(booking.id, booking.field.ownerId);
          successCount++;
          this.loggerService.debug(`Marked booking ${booking.id} as no-show`, 'BookingsProcessor');

          // Trigger no-show notification
          try {
            const updatedBooking = await this.prisma.booking.findUnique({
              where: { id: booking.id },
              include: {
                field: {
                  select: {
                    name: true,
                  },
                },
                player: {
                  select: {
                    noShowCount: true,
                    preferredLanguage: true,
                  },
                },
              },
            });

            if (updatedBooking) {
              await this.notificationsService.sendNoShowNotification(
                booking.playerId,
                updatedBooking.field.name,
                updatedBooking.player.noShowCount,
                updatedBooking.player.preferredLanguage || 'en',
              );
            }
          } catch (notifError) {
            this.loggerService.error(
              `Failed to send no-show notification for booking ${booking.id}`,
              undefined,
              'BookingsProcessor',
            );
          }
        } catch (error) {
          failureCount++;
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.loggerService.error(
            `Failed to mark booking ${booking.id} as no-show: ${message}`,
            undefined,
            'BookingsProcessor',
          );
        }
      }

      const duration = Date.now() - startTime;
      this.loggerService.log(
        `No-show detection completed: ${successCount} marked, ${failureCount} failed`,
        'BookingsProcessor',
        { duration, successCount, failureCount },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.loggerService.error(
        `Error during no-show detection check: ${message}`,
        stack,
        'BookingsProcessor',
      );
    }
  }

  /**
   * Cron job that runs every 5 minutes to check for expired bookings
   * Queries PENDING_PAYMENT bookings older than 15 minutes and cancels them
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processExpiredBookings(): Promise<void> {
    const startTime = Date.now();
    this.loggerService.log('Starting expired bookings check', 'BookingsProcessor');

    try {
      // Calculate cutoff time (15 minutes ago)
      const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);

      // Find all PENDING_PAYMENT bookings with expired payment deadline
      const expiredBookings = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.PENDING_PAYMENT,
          paymentDeadline: {
            lte: cutoffTime,
          },
        },
        select: {
          id: true,
          createdAt: true,
          paymentDeadline: true,
        },
      });

      if (expiredBookings.length === 0) {
        this.loggerService.log('No expired bookings found', 'BookingsProcessor');
        return;
      }

      this.loggerService.log(
        `Found ${expiredBookings.length} expired bookings to process`,
        'BookingsProcessor',
      );

      // Process each expired booking
      let successCount = 0;
      let failureCount = 0;

      for (const booking of expiredBookings) {
        try {
          await this.bookingsService.markPaymentFailed(booking.id);
          successCount++;
          this.loggerService.debug(
            `Cancelled expired booking ${booking.id}`,
            'BookingsProcessor',
            { deadline: booking.paymentDeadline },
          );
        } catch (error) {
          failureCount++;
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.loggerService.error(
            `Failed to cancel expired booking ${booking.id}: ${message}`,
            undefined,
            'BookingsProcessor',
          );
        }
      }

      const duration = Date.now() - startTime;
      this.loggerService.log(
        `Expired bookings check completed: ${successCount} cancelled, ${failureCount} failed`,
        'BookingsProcessor',
        { duration, successCount, failureCount },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.loggerService.error(
        `Error during expired bookings check: ${message}`,
        stack,
        'BookingsProcessor',
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.loggerService.log('Bookings processor shut down', 'BookingsProcessor');
    }
  }
}
