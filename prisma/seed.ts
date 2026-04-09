import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create app settings
  console.log('Creating app settings...');
  
  await prisma.appSetting.upsert({
    where: { key: 'deposit_percentage' },
    update: {},
    create: {
      key: 'deposit_percentage',
      value: '20',
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'global_commission_rate' },
    update: {},
    create: {
      key: 'global_commission_rate',
      value: '10',
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'cancellation_policy_hours' },
    update: {},
    create: {
      key: 'cancellation_policy_hours',
      value: '24',
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'cancellation_refund_percentage' },
    update: {},
    create: {
      key: 'cancellation_refund_percentage',
      value: '100',
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'no_show_suspension_threshold' },
    update: {},
    create: {
      key: 'no_show_suspension_threshold',
      value: '3',
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'suspension_duration_days' },
    update: {},
    create: {
      key: 'suspension_duration_days',
      value: '7',
    },
  });

  console.log('App settings created successfully');

  // Create test users
  console.log('Creating test users...');

  const hashedPassword = await bcrypt.hash('Test@123', 12);
  const myHashedPassword = await bcrypt.hash('ZXzx@442004', 12);

  const player = await prisma.user.upsert({
    where: { email: 'player@test.com' },
    update: {},
    create: {
      email: 'player@test.com',
      passwordHash: hashedPassword,
      role: 'PLAYER',
      isVerified: true,
      wallet: {
        create: {
          balance: 1000,
        },
      },
    },
  });

  const fieldOwner = await prisma.user.upsert({
    where: { email: 'owner@footballbooking.com' },
    update: {},
    create: {
      email: 'owner@footballbooking.com',
      passwordHash: myHashedPassword,
      role: 'FIELD_OWNER',
      isVerified: true,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@footballbooking.com' },
    update: {},
    create: {
      email: 'admin@footballbooking.com',
      passwordHash: myHashedPassword,
      role: 'ADMIN',
      isVerified: true,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  // Create your personal account
  const myAccount = await prisma.user.upsert({
    where: { email: 'my01281105973@gmail.com' },
    update: {},
    create: {
      email: 'my01281105973@gmail.com',
      passwordHash: myHashedPassword,
      role: 'PLAYER',
      isVerified: true,
      wallet: {
        create: {
          balance: 1000,
        },
      },
    },
  });

  console.log('Test users created successfully');
  console.log('- Player: player@test.com / Test@123');
  console.log('- Field Owner: owner@footballbooking.com / ZXzx@442004');
  console.log('- Admin: admin@footballbooking.com / ZXzx@442004');
  console.log('- Your Account: my01281105973@gmail.com / ZXzx@442004');

  // Create test fields
  console.log('Creating test fields...');

  const field1 = await prisma.$executeRawUnsafe(`
    INSERT INTO "Field" (
      id, "ownerId", name, description, address,
      location, latitude, longitude, "commissionRate",
      "averageRating", "totalReviews", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4,
      ST_GeogFromText($5), $6, $7, $8,
      4.5, 10, NOW(), NOW()
    )
  `,
    fieldOwner.id,
    'ملعب الأبطال',
    'ملعب خماسي احترافي مع إضاءة ليلية وأرضية عشب صناعي عالي الجودة',
    '123 شارع الرياضة، القاهرة',
    'POINT(31.2357 30.0444)',
    30.0444,
    31.2357,
    10.00
  );

  const field2 = await prisma.$executeRawUnsafe(`
    INSERT INTO "Field" (
      id, "ownerId", name, description, address,
      location, latitude, longitude, "commissionRate",
      "averageRating", "totalReviews", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4,
      ST_GeogFromText($5), $6, $7, $8,
      4.2, 8, NOW(), NOW()
    )
  `,
    fieldOwner.id,
    'ملعب النجوم',
    'ملعب سباعي مع كافيتريا وخدمات متكاملة',
    '456 شارع الملاعب، الجيزة',
    'POINT(31.2089 30.0131)',
    30.0131,
    31.2089,
    12.00
  );

  const field3 = await prisma.$executeRawUnsafe(`
    INSERT INTO "Field" (
      id, "ownerId", name, description, address,
      location, latitude, longitude, "commissionRate",
      "averageRating", "totalReviews", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4,
      ST_GeogFromText($5), $6, $7, $8,
      4.8, 15, NOW(), NOW()
    )
  `,
    fieldOwner.id,
    'ملعب الشباب',
    'ملعب خماسي حديث مع غرف تبديل ملابس ومواقف سيارات',
    '789 شارع النادي، المعادي',
    'POINT(31.2639 29.9602)',
    29.9602,
    31.2639,
    8.00
  );

  console.log('Test fields created successfully');
  console.log('- 3 fields created for owner@footballbooking.com');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
