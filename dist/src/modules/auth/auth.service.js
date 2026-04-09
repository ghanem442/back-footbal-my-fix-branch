"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_service_1 = require("../../config/config.service");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const email_service_1 = require("../email/email.service");
const otp_service_1 = require("../otp/otp.service");
const token_hasher_util_1 = require("./utils/token-hasher.util");
const schedule_1 = require("@nestjs/schedule");
let AuthService = AuthService_1 = class AuthService {
    constructor(jwtService, configService, usersService, prisma, redisService, emailService, otpService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.usersService = usersService;
        this.prisma = prisma;
        this.redisService = redisService;
        this.emailService = emailService;
        this.otpService = otpService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    generateAccessToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.secret'),
            expiresIn: '15m',
        });
    }
    generateRefreshToken(userId, familyId) {
        const tokenId = (0, crypto_1.randomUUID)();
        const payload = {
            userId,
            tokenId,
        };
        return this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: '7d',
        });
    }
    async generateTokenPair(userId, email, role) {
        const accessTokenPayload = {
            userId,
            email,
            role,
        };
        const accessToken = this.generateAccessToken(accessTokenPayload);
        const familyId = (0, crypto_1.randomUUID)();
        const tokenId = (0, crypto_1.randomUUID)();
        const refreshToken = this.jwtService.sign({ userId, tokenId }, {
            secret: this.configService.get('jwt.refreshSecret'),
            expiresIn: '7d',
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenId,
                familyId,
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken,
        };
    }
    async verifyAccessToken(token) {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.get('jwt.secret'),
        });
    }
    async verifyRefreshToken(token) {
        return this.jwtService.verifyAsync(token, {
            secret: this.configService.get('jwt.refreshSecret'),
        });
    }
    decodeToken(token) {
        return this.jwtService.decode(token);
    }
    async validateCredentials(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: {
                    en: 'Invalid email or password',
                    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                },
            });
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: {
                    en: 'Invalid email or password',
                    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                },
            });
        }
        const isPasswordValid = await this.usersService.verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: {
                    en: 'Invalid email or password',
                    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                },
            });
        }
        return user;
    }
    async refreshAccessToken(refreshToken) {
        try {
            const payload = await this.verifyRefreshToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { tokenId: payload.tokenId },
                include: { user: true },
            });
            if (!storedToken) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            if (storedToken.isRevoked) {
                await this.revokeTokenFamily(storedToken.familyId);
                throw new common_1.UnauthorizedException('Token theft detected. All tokens in family revoked.');
            }
            if (storedToken.expiresAt < new Date()) {
                throw new common_1.UnauthorizedException('Refresh token expired');
            }
            const newTokenId = (0, crypto_1.randomUUID)();
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: {
                    isRevoked: true,
                    revokedAt: new Date(),
                    replacedBy: newTokenId,
                },
            });
            const user = storedToken.user;
            const accessToken = this.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });
            const newRefreshToken = this.jwtService.sign({ userId: user.id, tokenId: newTokenId }, {
                secret: this.configService.get('jwt.refreshSecret'),
                expiresIn: '7d',
            });
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await this.prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenId: newTokenId,
                    familyId: storedToken.familyId,
                    expiresAt,
                },
            });
            return {
                accessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async revokeTokenFamily(familyId) {
        await this.prisma.refreshToken.updateMany({
            where: {
                familyId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
    }
    async revokeRefreshToken(tokenId) {
        await this.prisma.refreshToken.updateMany({
            where: { tokenId },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
    }
    async cleanupExpiredTokens() {
        const result = await this.prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return result.count;
    }
    async logout(accessToken, userId) {
        try {
            const payload = await this.verifyAccessToken(accessToken);
            const decoded = this.jwtService.decode(accessToken);
            const expiresAt = decoded.exp * 1000;
            const now = Date.now();
            const ttl = Math.max(0, Math.floor((expiresAt - now) / 1000));
            if (ttl > 0) {
                const cacheClient = this.redisService.getCacheClient();
                await cacheClient.setEx(`blacklist:${accessToken}`, ttl, 'revoked');
            }
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
        }
        catch (error) {
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
        }
    }
    async isTokenBlacklisted(token) {
        try {
            const cacheClient = this.redisService.getCacheClient();
            const result = await cacheClient.get(`blacklist:${token}`);
            return result !== null;
        }
        catch (error) {
            return false;
        }
    }
    async isUserBlacklisted(userId) {
        try {
            const cacheClient = this.redisService.getCacheClient();
            const result = await cacheClient.get(`user:blacklist:${userId}`);
            return result !== null;
        }
        catch (error) {
            return false;
        }
    }
    async generatePasswordResetToken(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return;
        }
        const { plainToken, hashedToken } = token_hasher_util_1.TokenHasher.generateAndHashToken(32);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.passwordResetToken.updateMany({
            where: {
                userId: user.id,
                isUsed: false,
            },
            data: {
                isUsed: true,
                usedAt: new Date(),
            },
        });
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: hashedToken,
                expiresAt,
            },
        });
        await this.emailService.sendPasswordResetEmail(email, plainToken);
    }
    async resetPassword(plainToken, newPassword) {
        const hashedToken = token_hasher_util_1.TokenHasher.hashToken(plainToken);
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token: hashedToken },
            include: { user: true },
        });
        if (!resetToken) {
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        }
        if (resetToken.isUsed) {
            throw new common_1.UnauthorizedException('Reset token has already been used');
        }
        if (resetToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Reset token has expired');
        }
        const passwordHash = await this.usersService.hashPassword(newPassword);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: {
                    isUsed: true,
                    usedAt: new Date(),
                },
            }),
        ]);
        await this.prisma.refreshToken.updateMany({
            where: {
                userId: resetToken.userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
        await this.emailService.sendPasswordResetConfirmation(resetToken.user.email);
    }
    async cleanupExpiredPasswordResetTokens() {
        const result = await this.prisma.passwordResetToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return result.count;
    }
    async handleOAuthUser(oauthId, email, provider) {
        let user = await this.prisma.user.findFirst({
            where: {
                oauthId,
                authProvider: provider,
            },
        });
        if (user) {
            const tokens = await this.generateTokenPair(user.id, user.email, user.role);
            return { user, tokens };
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            user = await this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    oauthId,
                    authProvider: provider,
                    isVerified: true,
                },
            });
            const tokens = await this.generateTokenPair(user.id, user.email, user.role);
            return { user, tokens };
        }
        user = await this.prisma.user.create({
            data: {
                email,
                oauthId,
                authProvider: provider,
                role: 'PLAYER',
                isVerified: true,
            },
        });
        await this.prisma.wallet.create({
            data: {
                userId: user.id,
            },
        });
        const tokens = await this.generateTokenPair(user.id, user.email, user.role);
        return { user, tokens };
    }
    async generateEmailVerificationToken(userId, email) {
        const { plainToken, hashedToken } = token_hasher_util_1.TokenHasher.generateAndHashToken(32);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.prisma.emailVerificationToken.updateMany({
            where: {
                userId,
                isUsed: false,
            },
            data: {
                isUsed: true,
                usedAt: new Date(),
            },
        });
        await this.prisma.emailVerificationToken.create({
            data: {
                userId,
                token: hashedToken,
                expiresAt,
            },
        });
        await this.emailService.sendEmailVerification(email, plainToken);
        if (process.env.NODE_ENV === 'development') {
            return plainToken;
        }
        return null;
    }
    async verifyEmail(plainToken) {
        const hashedToken = token_hasher_util_1.TokenHasher.hashToken(plainToken);
        const verificationToken = await this.prisma.emailVerificationToken.findUnique({
            where: { token: hashedToken },
            include: { user: true },
        });
        if (!verificationToken) {
            throw new common_1.UnauthorizedException('Invalid or expired verification token');
        }
        if (verificationToken.isUsed) {
            throw new common_1.UnauthorizedException('Verification token has already been used');
        }
        if (verificationToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Verification token has expired');
        }
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: verificationToken.userId },
                data: {
                    isVerified: true,
                    emailVerifiedAt: new Date(),
                },
            }),
            this.prisma.emailVerificationToken.update({
                where: { id: verificationToken.id },
                data: {
                    isUsed: true,
                    usedAt: new Date(),
                },
            }),
        ]);
    }
    async resendEmailVerification(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return;
        }
        if (user.isVerified) {
            throw new common_1.BadRequestException('Email is already verified');
        }
        await this.generateEmailVerificationToken(user.id, user.email);
    }
    async cleanupExpiredAuthTokens() {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const deletedResetTokens = await this.prisma.passwordResetToken.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        { isUsed: true, usedAt: { lt: sevenDaysAgo } },
                    ],
                },
            });
            const deletedVerificationTokens = await this.prisma.emailVerificationToken.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        { isUsed: true, usedAt: { lt: sevenDaysAgo } },
                    ],
                },
            });
            this.logger.log(`Token cleanup completed: ${deletedResetTokens.count} password reset tokens, ${deletedVerificationTokens.count} email verification tokens deleted`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Token cleanup failed: ${errorMessage}`);
        }
    }
    async sendPasswordResetOtp(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            this.logger.warn(`Password reset OTP requested for non-existent email: ${email}`);
            return;
        }
        await this.otpService.createAndSendOtp(user.id, 'EMAIL', email, 'PASSWORD_RESET');
        this.logger.log(`Password reset OTP sent to ${email}`);
    }
    async verifyOtpAndResetPassword(email, otp, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: { en: 'Invalid email or OTP', ar: 'البريد الإلكتروني أو رمز التحقق غير صحيح' },
            });
        }
        await this.otpService.verifyOtp(user.id, otp, 'PASSWORD_RESET');
        await this.usersService.updatePassword(user.id, newPassword);
        await this.prisma.refreshToken.updateMany({
            where: { userId: user.id, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() },
        });
        this.logger.log(`Password reset successful for user: ${email}`);
    }
};
exports.AuthService = AuthService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthService.prototype, "cleanupExpiredAuthTokens", null);
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_service_1.AppConfigService,
        users_service_1.UsersService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        email_service_1.EmailService,
        otp_service_1.OtpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map