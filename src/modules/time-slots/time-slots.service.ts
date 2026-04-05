import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { I18nService } from '@modules/i18n/i18n.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { BulkCreateTimeSlotsDto } from './dto/bulk-create-time-slots.dto';
import { SlotStatus } from '@prisma/client';

@Injectable()
export class TimeSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Create a new time slot for a field
   * Validates:
   * - Field exists and is owned by the user
   * - Start time is before end time
   * - No overlapping slots on the same field and date
   */
  async createTimeSlot(userId: string, dto: CreateTimeSlotDto) {
    // Validate field ownership
    const field = await this.prisma.field.findUnique({
      where: { id: dto.fieldId },
    });

    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    if (field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    if (field.deletedAt) {
      throw new BadRequestException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate date is not in the past
    const slotDate = new Date(dto.date + 'T00:00:00.000Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    slotDate.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.pastDate'),
      );
    }

    // Validate start time < end time
    const startTime = this.parseTime(dto.startTime);
    const endTime = this.parseTime(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.startTimeBeforeEndTime'),
      );
    }

    // Validate price is positive
    if (dto.price <= 0) {
      throw new BadRequestException(
        'Price must be greater than zero',
      );
    }

    // Check for overlapping slots
    const overlappingSlots = await this.prisma.timeSlot.findMany({
      where: {
        fieldId: dto.fieldId,
        date: new Date(dto.date + 'T00:00:00.000Z'),
        OR: [
          {
            // New slot starts during existing slot
            AND: [
              { startTime: { lte: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
              { endTime: { gt: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
            ],
          },
          {
            // New slot ends during existing slot
            AND: [
              { startTime: { lt: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
              { endTime: { gte: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
            ],
          },
          {
            // New slot completely contains existing slot
            AND: [
              { startTime: { gte: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
              { endTime: { lte: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
            ],
          },
        ],
      },
    });

    if (overlappingSlots.length > 0) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.overlappingSlot'),
      );
    }

    // Create the time slot
    const timeSlot = await this.prisma.timeSlot.create({
      data: {
        fieldId: dto.fieldId,
        date: new Date(dto.date + 'T00:00:00.000Z'),
        startTime: new Date(`1970-01-01T${dto.startTime}:00.000Z`),
        endTime: new Date(`1970-01-01T${dto.endTime}:00.000Z`),
        price: dto.price,
        status: SlotStatus.AVAILABLE,
      },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return timeSlot;
  }

  /**
   * Parse time string to minutes for comparison
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Query available time slots with filtering and pagination
   * Returns only AVAILABLE slots with future datetime
   * Supports filtering by fieldId and date range
   */
  async queryTimeSlots(dto: QueryTimeSlotsDto) {
    const { fieldId, startDate, endDate, page = 1, limit = 10 } = dto;

    // Build where clause
    const where: any = {
      status: SlotStatus.AVAILABLE,
    };

    // Filter by fieldId if provided
    if (fieldId) {
      where.fieldId = fieldId;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        where.date.lte = new Date(endDate + 'T00:00:00.000Z');
      }
    }

    // Calculate current datetime for future filtering
    const now = new Date();
    const currentDate = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = new Date(`1970-01-01T${hours}:${minutes}:00.000Z`);

    // Filter for future datetime: date > today OR (date = today AND startTime > now)
    // Use AND to avoid overriding existing where conditions (fieldId, date range)
    where.AND = [
      {
        OR: [
          { date: { gt: currentDate } },
          {
            AND: [
              { date: currentDate },
              { startTime: { gt: currentTime } },
            ],
          },
        ],
      },
    ];

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [timeSlots, total] = await Promise.all([
      this.prisma.timeSlot.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
        include: {
          field: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              averageRating: true,
            },
          },
        },
      }),
      this.prisma.timeSlot.count({ where }),
    ]);

    return {
      data: timeSlots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a time slot
   * Validates:
   * - Time slot exists
   * - Field is owned by the user
   * - Time slot is not booked (status = AVAILABLE)
   * - Start time is before end time (if times are being updated)
   * - No overlapping slots (if date/time is being updated)
   */
  async updateTimeSlot(
    timeSlotId: string,
    userId: string,
    dto: Partial<{
      date: string;
      startTime: string;
      endTime: string;
      price: number;
    }>,
  ) {
    // Find the time slot with field information
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        field: true,
        bookings: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(
        await this.i18n.translate('timeSlot.notFound'),
      );
    }

    // Validate field ownership
    if (timeSlot.field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Check if field is deleted
    if (timeSlot.field.deletedAt) {
      throw new BadRequestException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Prevent modification of booked slots
    if (timeSlot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.cannotModifyBooked'),
      );
    }

    // Validate start time < end time if times are being updated
    const newStartTime = dto.startTime || this.formatTime(timeSlot.startTime);
    const newEndTime = dto.endTime || this.formatTime(timeSlot.endTime);

    if (this.parseTime(newStartTime) >= this.parseTime(newEndTime)) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.startTimeBeforeEndTime'),
      );
    }

    // Check for overlapping slots if date or time is being updated
    if (dto.date || dto.startTime || dto.endTime) {
      const newDate = dto.date
        ? new Date(dto.date + 'T00:00:00.000Z')
        : timeSlot.date;

      // Validate date is not in the past if being updated
      if (dto.date) {
        const slotDate = new Date(dto.date + 'T00:00:00.000Z');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        slotDate.setHours(0, 0, 0, 0);

        if (slotDate < today) {
          throw new BadRequestException(
            await this.i18n.translate('timeSlot.pastDate'),
          );
        }
      }

      const overlappingSlots = await this.prisma.timeSlot.findMany({
        where: {
          id: { not: timeSlotId }, // Exclude current slot
          fieldId: timeSlot.fieldId,
          date: newDate,
          OR: [
            {
              // New slot starts during existing slot
              AND: [
                { startTime: { lte: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
                { endTime: { gt: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
              ],
            },
            {
              // New slot ends during existing slot
              AND: [
                { startTime: { lt: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
                { endTime: { gte: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
              ],
            },
            {
              // New slot completely contains existing slot
              AND: [
                { startTime: { gte: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
                { endTime: { lte: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
              ],
            },
          ],
        },
      });

      if (overlappingSlots.length > 0) {
        throw new BadRequestException(
          await this.i18n.translate('timeSlot.overlappingSlot'),
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (dto.date) {
      updateData.date = new Date(dto.date + 'T00:00:00.000Z');
    }
    if (dto.startTime) {
      updateData.startTime = new Date(`1970-01-01T${dto.startTime}:00.000Z`);
    }
    if (dto.endTime) {
      updateData.endTime = new Date(`1970-01-01T${dto.endTime}:00.000Z`);
    }
    if (dto.price !== undefined) {
      // Validate price is positive
      if (dto.price <= 0) {
        throw new BadRequestException(
          'Price must be greater than zero',
        );
      }
      updateData.price = dto.price;
    }

    // Update the time slot
    const updatedTimeSlot = await this.prisma.timeSlot.update({
      where: { id: timeSlotId },
      data: updateData,
      include: {
        field: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return updatedTimeSlot;
  }

  /**
   * Delete a time slot
   * Validates:
   * - Time slot exists
   * - Field is owned by the user
   * - Time slot is not booked (status = AVAILABLE)
   */
  async deleteTimeSlot(timeSlotId: string, userId: string) {
    // Find the time slot with field information
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        field: true,
        bookings: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(
        await this.i18n.translate('timeSlot.notFound'),
      );
    }

    // Validate field ownership
    if (timeSlot.field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Check if field is deleted
    if (timeSlot.field.deletedAt) {
      throw new BadRequestException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Prevent deletion of booked slots
    if (timeSlot.status === SlotStatus.BOOKED) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.cannotModifyBooked'),
      );
    }

    // Prevent deletion of past time slots
    const slotDate = new Date(timeSlot.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    slotDate.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.cannotDeletePastSlot'),
      );
    }

    // Delete the time slot
    await this.prisma.timeSlot.delete({
      where: { id: timeSlotId },
    });
  }

  /**
   * Format a Date object to HH:MM string (UTC)
   */
  private formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Bulk generate time slots for recurring schedules
   * Validates:
   * - Field exists and is owned by the user
   * - Start date is before or equal to end date
   * - Days of week are valid (0-6)
   * - Time ranges are valid (start < end)
   * - No overlapping slots
   * Uses database transaction for atomicity
   */
  async bulkCreateTimeSlots(userId: string, dto: BulkCreateTimeSlotsDto) {
    // Validate field ownership
    const field = await this.prisma.field.findUnique({
      where: { id: dto.fieldId },
    });

    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    if (field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    if (field.deletedAt) {
      throw new BadRequestException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate date range
    const startDate = new Date(dto.startDate + 'T00:00:00.000Z');
    const endDate = new Date(dto.endDate + 'T00:00:00.000Z');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.pastDate'),
      );
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.invalidDateRange'),
      );
    }

    // Validate days of week (0-6)
    const invalidDays = dto.daysOfWeek.filter(day => day < 0 || day > 6);
    if (invalidDays.length > 0) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.invalidDaysOfWeek'),
      );
    }

    // Validate time ranges
    for (const timeRange of dto.timeRanges) {
      const startTime = this.parseTime(timeRange.startTime);
      const endTime = this.parseTime(timeRange.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException(
          await this.i18n.translate('timeSlot.startTimeBeforeEndTime'),
        );
      }

      // Validate price is positive
      if (timeRange.price <= 0) {
        throw new BadRequestException(
          'Price must be greater than zero',
        );
      }
    }

    // Generate all dates that match the days of week
    const datesToGenerate: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dto.daysOfWeek.includes(dayOfWeek)) {
        datesToGenerate.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (datesToGenerate.length === 0) {
      throw new BadRequestException(
        await this.i18n.translate('timeSlot.noDatesGenerated'),
      );
    }

    // Generate time slots for each date and time range
    const slotsToCreate: Array<{
      fieldId: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      price: number;
      status: SlotStatus;
    }> = [];

    for (const date of datesToGenerate) {
      for (const timeRange of dto.timeRanges) {
        slotsToCreate.push({
          fieldId: dto.fieldId,
          date: date,
          startTime: new Date(`1970-01-01T${timeRange.startTime}:00.000Z`),
          endTime: new Date(`1970-01-01T${timeRange.endTime}:00.000Z`),
          price: timeRange.price,
          status: SlotStatus.AVAILABLE,
        });
      }
    }

    // Check for overlapping slots in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Check for overlapping slots for all dates and time ranges
      for (const slot of slotsToCreate) {
        const overlappingSlots = await tx.timeSlot.findMany({
          where: {
            fieldId: slot.fieldId,
            date: slot.date,
            OR: [
              {
                // New slot starts during existing slot
                AND: [
                  { startTime: { lte: slot.startTime } },
                  { endTime: { gt: slot.startTime } },
                ],
              },
              {
                // New slot ends during existing slot
                AND: [
                  { startTime: { lt: slot.endTime } },
                  { endTime: { gte: slot.endTime } },
                ],
              },
              {
                // New slot completely contains existing slot
                AND: [
                  { startTime: { gte: slot.startTime } },
                  { endTime: { lte: slot.endTime } },
                ],
              },
            ],
          },
        });

        if (overlappingSlots.length > 0) {
          const dateStr = slot.date.toISOString().split('T')[0];
          const startTimeStr = this.formatTime(slot.startTime);
          const endTimeStr = this.formatTime(slot.endTime);
          throw new BadRequestException(
            await this.i18n.translate('timeSlot.overlappingSlotDetails', {
              args: { date: dateStr, startTime: startTimeStr, endTime: endTimeStr },
            }),
          );
        }
      }

      // Create all time slots
      const createdSlots = await tx.timeSlot.createMany({
        data: slotsToCreate,
      });

      return createdSlots;
    });

    return {
      count: result.count,
      dates: datesToGenerate.length,
      timeRanges: dto.timeRanges.length,
    };
  }
}
