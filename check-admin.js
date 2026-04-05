const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@fieldbook.com' },
    select: { id: true, email: true, name: true, role: true, isVerified: true, passwordHash: true }
  });

  if (!user) {
    console.log('❌ User NOT FOUND');
    return;
  }

  console.log('✅ User found:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Role:', user.role);
  console.log('  isVerified:', user.isVerified);

  const passwords = ['Admin@123456', 'Admin1@123456', 'admin@123456', 'Admin123456'];
  for (const p of passwords) {
    const match = await bcrypt.compare(p, user.passwordHash);
    if (match) {
      console.log('  ✅ Password match:', p);
      return;
    }
  }
  console.log('  ❌ None of the tested passwords match');
  console.log('  Hash:', user.passwordHash);
}

main().catch(console.error).finally(() => prisma.$disconnect());
