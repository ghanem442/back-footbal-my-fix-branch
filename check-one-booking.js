const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.booking.findUnique({
  where: { id: '377caf90-e1c4-4f0d-84e5-a9f1c82e067a' },
  include: { payment: true, qrCode: { select: { qrToken: true } } }
}).then(b => {
  console.log('Status:', b?.status);
  console.log('BookingNumber:', b?.bookingNumber);
  console.log('Payment:', b?.payment?.status, b?.payment?.gateway);
  console.log('QR:', b?.qrCode ? '✅' : '❌');
}).finally(() => p.$disconnect());
