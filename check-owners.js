const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({
  where: { role: 'FIELD_OWNER' },
  select: { id: true, email: true, name: true, isVerified: true }
}).then(u => console.log(JSON.stringify(u, null, 2))).finally(() => p.$disconnect());
