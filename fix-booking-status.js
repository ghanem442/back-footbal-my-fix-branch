const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const b = await p.booking.update({
    where: { id: '377caf90-e1c4-4f0d-84e5-a9f1c82e067a' },
    data: { status: 'CONFIRMED', bookingNumber: 'BK-' + Date.now() + '-PAY' }
  });
  console.log('✅ Fixed:', b.status, b.bookingNumber);
}

main().catch(console.error).finally(() => p.$disconnect());
