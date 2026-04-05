const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const NEW_PASSWORD = 'Admin@123456';

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.user.update({
    where: { email: 'admin@fieldbook.com' },
    data: { passwordHash: hash }
  });
  console.log('✅ Password reset successfully!');
  console.log('  Email: admin@fieldbook.com');
  console.log('  Password:', NEW_PASSWORD);
}

main().catch(console.error).finally(() => prisma.$disconnect());
