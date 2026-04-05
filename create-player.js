const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('ZXZX@442004', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'my01281105973@gmail.com',
      name: 'GHANEM',
      passwordHash: hash,
      role: 'PLAYER',
      isVerified: true,
      emailVerifiedAt: new Date(),
    }
  });

  await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

  console.log('✅ Player created:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Role:', user.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
