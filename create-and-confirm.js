const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

async function main() {
  const player = await p.user.findUnique({ where: { email: 'my01281105973@gmail.com' } });
  const field = await p.field.findFirst({ where: { deletedAt: null } });

  // Find an available slot or create one
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  let slot = await p.timeSlot.findFirst({
    where: { fieldId: field.id, status: 'AVAILABLE', date: { gte: tomorrow } }
  });

  if (!slot) {
    slot = await p.timeSlot.create({
      data: {
        fieldId: field.id,
        date: tomorrow,
        startTime: new Date('1970-01-01T16:00:00.000Z'),
        endTime: new Date('1970-01-01T17:00:00.000Z'),
        price: 300,
        status: 'BOOKED',
      }
    });
  } else {
    await p.timeSlot.update({ where: { id: slot.id }, data: { status: 'BOOKED' } });
  }

  const bookingNumber = `BK-${Date.now()}-CONF`;
  const booking = await p.booking.create({
    data: {
      playerId: player.id,
      fieldId: field.id,
      timeSlotId: slot.id,
      bookingNumber,
      status: 'CONFIRMED',
      scheduledDate: slot.date,
      scheduledStartTime: slot.startTime,
      scheduledEndTime: slot.endTime,
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

  console.log('✅ Booking confirmed!');
  console.log('Booking ID:    ', booking.id);
  console.log('Booking Number:', bookingNumber);
  console.log('Status:        ', booking.status);
  console.log('QR Token:      ', qrToken);
}

main().catch(console.error).finally(() => p.$disconnect());
