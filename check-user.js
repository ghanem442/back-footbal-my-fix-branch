const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'my01281105973@gmail.com' },
    select: { id: true, email: true, name: true, role: true, isVerified: true, createdAt: true }
  });

  if (!user) {
    console.log('❌ User NOT FOUND');
  } else {
    console.log('✅ User found:');
    console.log(JSON.stringify(user, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
