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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const error_codes_1 = require("../../common/constants/error-codes");
let UsersService = UsersService_1 = class UsersService {
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.SALT_ROUNDS = 12;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async createUser(email, password, role = client_1.Role.PLAYER, name) {
        try {
            this.logger.log(`Creating user with email: ${email}, role: ${role}`);
            this.logger.log('Checking if user already exists...');
            const existingUser = await this.prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                this.logger.warn(`User already exists with email: ${email}`);
                throw new common_1.HttpException(error_codes_1.ErrorCodes.EMAIL_ALREADY_EXISTS, error_codes_1.ErrorCodes.EMAIL_ALREADY_EXISTS.httpStatus);
            }
            this.logger.log('Hashing password...');
            const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
            this.logger.log('Password hashed successfully');
            this.logger.log('Creating user and wallet in transaction...');
            const user = await this.prisma.$transaction(async (tx) => {
                this.logger.log('Creating user record...');
                const newUser = await tx.user.create({
                    data: {
                        email,
                        passwordHash,
                        role,
                        name,
                    },
                });
                this.logger.log(`User created with ID: ${newUser.id}`);
                this.logger.log('Creating wallet for user...');
                await tx.wallet.create({
                    data: {
                        userId: newUser.id,
                        balance: 0,
                    },
                });
                this.logger.log('Wallet created successfully');
                return newUser;
            });
            this.logger.log(`User creation completed successfully for: ${email}`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }
    async updateProfile(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
        });
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async hashPassword(password) {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    async markAsVerified(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isVerified: true,
                emailVerifiedAt: new Date(),
            },
        });
    }
    async changeUserRole(userId, newRole, adminUserId) {
        const user = await this.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const oldRole = user.role;
        if (oldRole === newRole) {
            return { user, oldRole, newRole };
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { role: newRole },
        });
        await this.invalidateAllUserTokens(userId);
        this.logger.log(`Role changed for user ${userId} (${user.email}) from ${oldRole} to ${newRole} by admin ${adminUserId}`);
        return {
            user: updatedUser,
            oldRole,
            newRole,
        };
    }
    async invalidateAllUserTokens(userId) {
        try {
            const activeRefreshTokens = await this.prisma.refreshToken.findMany({
                where: {
                    userId,
                    isRevoked: false,
                },
            });
            await this.prisma.refreshToken.updateMany({
                where: {
                    userId,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    revokedAt: new Date(),
                },
            });
            this.logger.log(`Revoked ${activeRefreshTokens.length} refresh tokens for user ${userId}`);
            const cacheClient = this.redisService.getCacheClient();
            const ttl = 15 * 60;
            await cacheClient.setEx(`user:blacklist:${userId}`, ttl, new Date().toISOString());
            this.logger.log(`Added user ${userId} to token blacklist for ${ttl} seconds`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to invalidate tokens for user ${userId}: ${errorMessage}`, errorStack);
            throw error;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], UsersService);
//# sourceMappingURL=users.service.js.map