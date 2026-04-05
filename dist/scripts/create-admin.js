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
async function createAdminUser() {
    const adminEmail = 'admin@fieldbook.com';
    const adminPassword = 'Admin@123456';
    const adminName = 'System Admin';
    try {
        console.log('🔧 Creating admin user...');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('');
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
        const passwordHash = await bcrypt.hash(adminPassword, 10);
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
    }
    catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
createAdminUser()
    .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=create-admin.js.map