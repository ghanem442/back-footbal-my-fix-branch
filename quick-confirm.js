const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

async function main() {
  const player = await p.user.findUnique({ where: { email: 'my01281105973@gmail.com' } });
  const field = await p.field.findFirst({ where: { deletedAt: null } });

  // Create slot with unique time (use current timestamp for uniqueness)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(0, 0, 0, 0);

  const hour = new Date();
  const startHour = (hour.getHours() % 20) + 1; // unique hour
  const startTime = new Date(`1970-01-01T${String(startHour).padStart(2,'0')}:00:00.000Z`);
  const endTime = new Date(`1970-01-01T${String(startHour+1).padStart(2,'0')}:00:00.000Z`);

  const slot = await p.timeSlot.create({
    data: {
      fieldId: field.id,
      date: tomorrow,
      startTime,
      endTime,
      price: 300,
      status: 'BOOKED',
    }
  });

  const bookingNumber = `BK-${Date.now()}-TEST`;
  const booking = await p.booking.create({
    data: {
      playerId: player.id,
      fieldId: field.id,
      timeSlotId: slot.id,
      bookingNumber,
      status: 'CONFIRMED',
      scheduledDate: tomorrow,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      totalPrice: 300,
      depositAmount: 60,
      commissionRate: 10,
      commissionAmount: 30,
      ownerRevenue: 30,
    }
  });

  await p.payment.create({
    data: {
      bookingId: booking.id,
      gateway: 'PAYMOB',
      amount: 60,
      currency: 'EGP',
      status: 'COMPLETED',
      transactionId: 'dev-' + Date.now(),
    }
  });

  const qrToken = booking.id + '-' + crypto.randomUUID();
  await p.qrCode.create({
    data: {
      bookingId: booking.id,
      qrToken,
      imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + qrToken,
      isUsed: false,
    }
  });

  console.log('✅ Done!');
  console.log('Booking ID:    ', booking.id);
  console.log('Booking Number:', bookingNumber);
  console.log('Status:         CONFIRMED');
  console.log('QR Token:      ', qrToken);
}

main().catch(console.error).finally(() => p.$disconnect());
