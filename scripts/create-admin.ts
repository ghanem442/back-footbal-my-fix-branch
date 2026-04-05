import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  const adminEmail = 'admin@fieldbook.com';
  const adminPassword = 'Admin@123456';
  const adminName = 'System Admin';

  try {
    console.log('🔧 Creating admin user...');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log('Updating to ADMIN role...');
      
      const updatedUser = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          role: 'ADMIN',
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      console.log('✅ User updated to ADMIN successfully!');
      console.log(`User ID: ${updatedUser.id}`);
      console.log('');
      return updatedUser;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
        emailVerifiedAt: new Date(),
        preferredLanguage: 'en',
      },
    });

    // Create wallet for admin
    await prisma.wallet.create({
      data: {
        userId: adminUser.id,
        balance: 0,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`User ID: ${adminUser.id}`);
    console.log('');
    console.log('Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');
    console.log('You can now login at: POST /auth/login');
    console.log('');

    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
