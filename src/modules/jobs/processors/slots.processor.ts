import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../constants/queue-names';
import { SlotStatus } from '@prisma/client';

/**
 * Job data types for slots queue
 */
export interface SlotGenerationJobData {
  fieldId: string;
  schedule: RecurringSchedule;
}

export interface RecurringSchedule {
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  slotDuration: number; // Duration in minutes
  price: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Processor for slots queue
 * Handles recurring time slot generation jobs
 */
@Injectable()
export class SlotsProcessor implements OnModuleInit {
  private readonly logger = new Logger(SlotsProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUE_NAMES.SLOTS,
      async (job: Job) => {
        this.logger.log(
          `Processing job ${job.id} of type ${job.name} from slots queue`,
        );

        try {
          switch (job.name) {
            case 'generate':
              await this.handleGeneration(job);
              break;
            case 'bulk-generate':
              await this.handleBulkGeneration(job);
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
        concurrency: 3, // Process up to 3 slot generation jobs concurrently
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

    this.logger.log('Slots processor initialized');
  }

  /**
   * Handle slot generation job
   * Generates time slots based on recurring schedule
   */
  private async handleGeneration(
    job: Job<SlotGenerationJobData>,
  ): Promise<void> {
    const { fieldId, schedule } = job.data;
    const startTime = Date.now();
    this.logger.log(`Generating slots for field ${fieldId}`);

    try {
      const { daysOfWeek, startTime: slotStartTime, endTime: slotEndTime, slotDuration, price, startDate, endDate } = schedule;

      // Generate all dates that match the days of week
      const datesToGenerate: Date[] = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          datesToGenerate.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (datesToGenerate.length === 0) {
        this.logger.warn(`No dates to generate for field ${fieldId}`);
        return;
      }

      // Generate time slots for each date
      const slotsToCreate: Array<{
        fieldId: string;
        date: Date;
        startTime: Date;
        endTime: Date;
        price: number;
        status: SlotStatus;
      }> = [];

      for (const date of datesToGenerate) {
        // Parse start and end times
        const [startHours, startMinutes] = slotStartTime.split(':').map(Number);
        const [endHours, endMinutes] = slotEndTime.split(':').map(Number);

        let currentSlotStart = startHours * 60 + startMinutes; // in minutes
        const dayEnd = endHours * 60 + endMinutes; // in minutes

        // Generate slots for the day
        while (currentSlotStart + slotDuration <= dayEnd) {
          const slotStartHours = Math.floor(currentSlotStart / 60);
          const slotStartMinutes = currentSlotStart % 60;
          const slotEndMinutes = currentSlotStart + slotDuration;
          const slotEndHours = Math.floor(slotEndMinutes / 60);
          const slotEndMins = slotEndMinutes % 60;

          slotsToCreate.push({
            fieldId,
            date: date,
            startTime: new Date(`1970-01-01T${slotStartHours.toString().padStart(2, '0')}:${slotStartMinutes.toString().padStart(2, '0')}:00`),
            endTime: new Date(`1970-01-01T${slotEndHours.toString().padStart(2, '0')}:${slotEndMins.toString().padStart(2, '0')}:00`),
            price,
            status: SlotStatus.AVAILABLE,
          });

          currentSlotStart += slotDuration;
        }
      }

      // Create slots in a transaction, skipping existing ones
      const result = await this.prisma.$transaction(async (tx) => {
        let createdCount = 0;
        let skippedCount = 0;

        for (const slot of slotsToCreate) {
          // Check if slot already exists
          const existingSlot = await tx.timeSlot.findFirst({
            where: {
              fieldId: slot.fieldId,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          });

          if (existingSlot) {
            skippedCount++;
            continue;
          }

          // Create the slot
          await tx.timeSlot.create({
            data: slot,
          });
          createdCount++;
        }

        return { createdCount, skippedCount };
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Slot generation completed for field ${fieldId}: ${result.createdCount} created, ${result.skippedCount} skipped (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to generate slots for field ${fieldId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  /**
   * Handle bulk slot generation job
   * Generates slots for multiple fields or extended periods
   */
  private async handleBulkGeneration(
    job: Job<SlotGenerationJobData>,
  ): Promise<void> {
    const { fieldId, schedule } = job.data;
    this.logger.log(`Bulk generating slots for field ${fieldId}`);

    // For now, bulk generation uses the same logic as regular generation
    // In the future, this could be optimized for larger batches
    await this.handleGeneration(job);
  }

  /**
   * Cron job that runs daily to generate recurring time slots
   * Queries fields with recurring schedules and generates slots for next 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringSlotGeneration(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting recurring slot generation');

    try {
      // For this implementation, we'll assume recurring schedules are stored in field metadata
      // In a real implementation, you might have a separate RecurringSchedule table
      
      // Get all active fields
      const fields = await this.prisma.field.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (fields.length === 0) {
        this.logger.log('No fields found for slot generation');
        return;
      }

      this.logger.log(`Found ${fields.length} fields to check for recurring schedules`);

      // For now, we'll just log that we would generate slots
      // In a real implementation, you would:
      // 1. Query fields with recurring schedules from a RecurringSchedule table
      // 2. For each field with a schedule, generate slots for the next 30 days
      // 3. Skip slots that already exist
      
      // Example implementation (commented out as we don't have RecurringSchedule table):
      /*
      const recurringSchedules = await this.prisma.recurringSchedule.findMany({
        where: {
          field: {
            deletedAt: null,
          },
          isActive: true,
        },
        include: {
          field: true,
        },
      });

      let totalCreated = 0;
      let totalSkipped = 0;

      for (const schedule of recurringSchedules) {
        try {
          const now = new Date();
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + 30); // Next 30 days

          const result = await this.handleGeneration({
            data: {
              fieldId: schedule.fieldId,
              schedule: {
                daysOfWeek: schedule.daysOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                slotDuration: schedule.slotDuration,
                price: schedule.price,
                startDate: now,
                endDate: endDate,
              },
            },
          } as Job<SlotGenerationJobData>);

          totalCreated += result.createdCount;
          totalSkipped += result.skippedCount;
        } catch (error) {
          this.logger.error(
            `Failed to generate slots for field ${schedule.fieldId}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Recurring slot generation completed: ${totalCreated} created, ${totalSkipped} skipped (duration: ${duration}ms)`,
      );
      */

      const duration = Date.now() - startTime;
      this.logger.log(
        `Recurring slot generation check completed (duration: ${duration}ms)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error during recurring slot generation: ${message}`,
        stack,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Slots processor shut down');
    }
  }
}
