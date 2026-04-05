const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const bookings = await p.booking.findMany({
    where: { playerId: '4a15496d-20db-4d2b-98c5-9152cf5c07e5' },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: { select: { status: true, gateway: true } },
      qrCode: { select: { qrToken: true } }
    },
  });

  console.log('Total bookings:', bookings.length);
  bookings.forEach(b => {
    console.log(`\n📋 ${b.id}`);
    console.log(`   Number:  ${b.bookingNumber ?? 'N/A'}`);
    console.log(`   Status:  ${b.status}`);
    console.log(`   Deposit: ${b.depositAmount} EGP`);
    console.log(`   Payment: ${b.payment?.status ?? 'none'} (${b.payment?.gateway ?? '-'})`);
    console.log(`   QR:      ${b.qrCode ? '✅' : '❌'}`);
  });

  const wallet = await p.wallet.findUnique({ where: { userId: '4a15496d-20db-4d2b-98c5-9152cf5c07e5' } });
  console.log('\n💰 Player wallet balance:', wallet?.balance?.toString() ?? '0');

  const platform = await p.$queryRaw`SELECT balance FROM "PlatformWallet" WHERE id = 'platform-wallet-001'`;
  console.log('🏦 Platform wallet balance:', platform[0]?.balance?.toString() ?? '0');
}

main().catch(console.error).finally(() => p.$disconnect());
