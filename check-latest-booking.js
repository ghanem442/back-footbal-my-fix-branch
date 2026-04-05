const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.booking.findMany({
  where: { playerId: '4a15496d-20db-4d2b-98c5-9152cf5c07e5' },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { id: true, status: true, totalPrice: true, depositAmount: true, paymentDeadline: true, createdAt: true }
}).then(b => console.log(JSON.stringify(b, null, 2))).finally(() => p.$disconnect());
