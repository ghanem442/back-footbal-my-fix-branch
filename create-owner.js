const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Owner@123456', 10);
  const user = await p.user.create({
    data: {
      email: 'owner@fieldbook.com',
      name: 'Field Owner',
      passwordHash: hash,
      role: 'FIELD_OWNER',
      isVerified: true,
      emailVerifiedAt: new Date(),
    }
  });
  await p.wallet.create({ data: { userId: user.id, balance: 0 } });
  console.log('✅ Created:', user.email, '| Password: Owner@123456');
}

main().catch(console.error).finally(() => p.$disconnect());
