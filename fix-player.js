const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('ZXZX@442004', 10);
  const user = await prisma.user.update({
    where: { email: 'my01281105973@gmail.com' },
    data: { name: 'GHANEM', passwordHash: hash, isVerified: true, emailVerifiedAt: new Date() }
  });
  console.log('✅ Done:', user.id, '|', user.email, '|', user.name, '|', user.role, '| verified:', user.isVerified);
}

main().catch(console.error).finally(() => prisma.$disconnect());
