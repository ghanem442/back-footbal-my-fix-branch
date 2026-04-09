"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting database seeding...');
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
  `, fieldOwner.id, 'ملعب الأبطال', 'ملعب خماسي احترافي مع إضاءة ليلية وأرضية عشب صناعي عالي الجودة', '123 شارع الرياضة، القاهرة', 'POINT(31.2357 30.0444)', 30.0444, 31.2357, 10.00);
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
  `, fieldOwner.id, 'ملعب النجوم', 'ملعب سباعي مع كافيتريا وخدمات متكاملة', '456 شارع الملاعب، الجيزة', 'POINT(31.2089 30.0131)', 30.0131, 31.2089, 12.00);
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
  `, fieldOwner.id, 'ملعب الشباب', 'ملعب خماسي حديث مع غرف تبديل ملابس ومواقف سيارات', '789 شارع النادي، المعادي', 'POINT(31.2639 29.9602)', 29.9602, 31.2639, 8.00);
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
//# sourceMappingURL=seed.js.map