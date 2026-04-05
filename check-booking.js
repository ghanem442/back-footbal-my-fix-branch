const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.booking.findUnique({
  where: { id: '9c3140a9-d401-42e9-bf5e-dcb1fcc1fa15' },
  select: { id: true, status: true, playerId: true, paymentDeadline: true, depositAmount: true }
}).then(b => console.log(JSON.stringify(b, null, 2))).finally(() => p.$disconnect());
