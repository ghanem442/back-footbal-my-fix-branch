const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const total = await p.timeSlot.count();
  console.log('Total slots in DB:', total);

  const slots = await p.timeSlot.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, fieldId: true, date: true, startTime: true, endTime: true, status: true, price: true }
  });
  console.log('Latest 5 slots:', JSON.stringify(slots, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
