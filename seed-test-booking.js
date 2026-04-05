const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const p = new PrismaClient();

async function main() {
  // Get player
  const player = await p.user.findUnique({ where: { email: 'my01281105973@gmail.com' } });
  if (!player) return console.log('❌ Player not found');

  // Get or create field owner
  const owner = await p.user.findFirst({ where: { role: 'FIELD_OWNER' } });
  if (!owner) return console.log('❌ No field owner found');

  // Get or create a field
  let field = await p.field.findFirst({ where: { ownerId: owner.id, deletedAt: null } });
  if (!field) {
    field = await p.field.create({
      data: {
        ownerId: owner.id,
        name: 'ملعب النصر',
        address: 'القاهرة، مصر',
        basePrice: 300,
        status: 'ACTIVE',
      }
    });
    console.log('✅ Field created:', field.name);
  }

  // Create time slot for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const startTime = new Date('1970-01-01T11:00:00.000Z');
  const endTime = new Date('1970-01-01T12:00:00.000Z');

  let slot = await p.timeSlot.findFirst({
    where: { fieldId: field.id, date: tomorrow, status: 'BOOKED' }
  });

  if (!slot) {
    slot = await p.timeSlot.create({
      data: {
        fieldId: field.id,
        date: tomorrow,
        startTime,
        endTime,
        price: 300,
        status: 'BOOKED',
      }
    });
  }

  // Create confirmed booking
  const bookingNumber = `BK-${Date.now()}-TEST01`;
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

  // Create payment record
  await p.payment.create({
    data: {
      bookingId: booking.id,
      gateway: 'PAYMOB',
      amount: 60,
      currency: 'EGP',
      status: 'COMPLETED',
      transactionId: 'test-tx-' + Date.now(),
    }
  });

  // Create QR code
  const qrToken = booking.id + '-' + crypto.randomUUID();
  await p.qrCode.create({
    data: {
      bookingId: booking.id,
      qrToken,
      imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + qrToken,
      isUsed: false,
    }
  });

  // Add wallet balance for testing refund
  const wallet = await p.wallet.findUnique({ where: { userId: player.id } });
  if (wallet) {
    await p.wallet.update({ where: { id: wallet.id }, data: { balance: 200 } });
    await p.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount: 200,
        balanceBefore: 0,
        balanceAfter: 200,
        description: 'Test wallet balance',
        reference: 'test-seed',
      }
    });
  }

  console.log('\n✅ Test data created successfully!\n');
  console.log('📋 Booking ID:     ', booking.id);
  console.log('📋 Booking Number: ', bookingNumber);
  console.log('📋 Status:         ', booking.status);
  console.log('📋 Date:           ', tomorrow.toDateString());
  console.log('📋 Time:           ', '11:00 AM - 12:00 PM');
  console.log('📋 Total Price:    ', '300 EGP');
  console.log('📋 Deposit:        ', '60 EGP');
  console.log('📋 QR Token:       ', qrToken);
  console.log('💰 Wallet Balance: ', '200 EGP');
  console.log('\n🔗 QR Image URL:');
  console.log('   https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + qrToken);
}

main().catch(console.error).finally(() => p.$disconnect());
