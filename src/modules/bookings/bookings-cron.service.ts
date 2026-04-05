import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsCronService {
  private readonly logger = new Logger(BookingsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every 5 minutes: expire unpaid bookings past their payment deadline
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireUnpaidBookings() {
    const now = new Date();

    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        paymentDeadline: { lt: now },
      },
      select: { id: true, timeSlotId: true },
    });

    if (!expired.length) return;

    this.logger.log(`Expiring ${expired.length} unpaid bookings`);

    for (const booking of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.PAYMENT_FAILED },
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.PENDING_PAYMENT,
            toStatus: BookingStatus.PAYMENT_FAILED,
            reason: 'Payment deadline expired',
          },
        });
        await tx.timeSlot.update({
          where: { id: booking.timeSlotId },
          data: { status: 'AVAILABLE' },
        });
      });
    }
  }

  /**
   * Every 10 minutes: mark confirmed bookings as EXPIRED_NO_SHOW if time passed with no scan
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireNoShowBookings() {
    const now = new Date();

    // Find CONFIRMED bookings where scheduled time has passed
    const bookings = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT b.id FROM "Booking" b
      WHERE b.status = 'CONFIRMED'::"BookingStatus"
        AND (b."scheduledDate"::date + b."scheduledEndTime"::time) < ${now}
    `;

    if (!bookings.length) return;

    this.logger.log(`Marking ${bookings.length} bookings as EXPIRED_NO_SHOW`);

    for (const booking of bookings) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED_NO_SHOW' as BookingStatus },
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.CONFIRMED,
            toStatus: 'EXPIRED_NO_SHOW' as BookingStatus,
            reason: 'Booking time passed without QR scan',
          },
        });
      });
    }
  }
}
