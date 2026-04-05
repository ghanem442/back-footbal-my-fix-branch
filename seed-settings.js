const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const settings = [
    { key: 'deposit_percentage', value: '20', dataType: 'number' },
    { key: 'global_commission_rate', value: '10', dataType: 'number' },
    { key: 'cancellation_threshold_maxh', value: '3', dataType: 'number' },
    { key: 'cancellation_refund_max_percent', value: '100', dataType: 'number' },
    { key: 'cancellation_refund_min_percent', value: '0', dataType: 'number' },
  ];

  for (const s of settings) {
    await p.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
    console.log(`✅ ${s.key} = ${s.value}`);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
