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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sms_otp_channel_1 = require("./channels/sms-otp-channel");
const email_otp_channel_1 = require("./channels/email-otp-channel");
let OtpService = class OtpService {
    constructor(prisma, smsOtpChannel, emailOtpChannel) {
        this.prisma = prisma;
        this.smsOtpChannel = smsOtpChannel;
        this.emailOtpChannel = emailOtpChannel;
        this.OTP_EXPIRATION_MINUTES = 10;
        this.COOLDOWN_SECONDS = 60;
        this.LOCK_DURATION_MINUTES = 30;
        this.MAX_FAILURE_COUNT = 5;
    }
    generateOtp() {
        const min = 100000;
        const max = 999999;
        const otp = Math.floor(Math.random() * (max - min + 1)) + min;
        return otp.toString();
    }
    getChannel(channel) {
        switch (channel) {
            case 'SMS':
                return this.smsOtpChannel;
            case 'EMAIL':
                return this.emailOtpChannel;
            default:
                throw new common_1.BadRequestException(`Unsupported OTP channel: ${channel}`);
        }
    }
    async createAndSendOtp(userId, channel, recipient, purpose) {
        const otpCode = await this.createOtpCode(userId, channel, purpose);
        const otpChannel = this.getChannel(channel);
        await otpChannel.send(recipient, otpCode.code);
        return otpCode;
    }
    async createOtpCode(userId, channel, purpose) {
        await this.validateCooldown(userId, purpose);
        const code = this.generateOtp();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRATION_MINUTES);
        const otpCode = await this.prisma.otpCode.create({
            data: {
                userId,
                code,
                channel,
                purpose,
                expiresAt,
            },
        });
        return otpCode;
    }
    async validateCooldown(userId, purpose) {
        const recentOtp = await this.prisma.otpCode.findFirst({
            where: {
                userId,
                purpose,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (recentOtp) {
            const now = new Date();
            const timeSinceLastOtp = (now.getTime() - recentOtp.createdAt.getTime()) / 1000;
            if (timeSinceLastOtp < this.COOLDOWN_SECONDS) {
                const remainingSeconds = Math.ceil(this.COOLDOWN_SECONDS - timeSinceLastOtp);
                throw new common_1.ConflictException(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
            }
        }
    }
    async verifyOtp(userId, code, purpose) {
        const otpCode = await this.prisma.otpCode.findFirst({
            where: {
                userId,
                purpose,
                verifiedAt: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!otpCode) {
            throw new common_1.BadRequestException('No OTP found for verification');
        }
        if (otpCode.lockedUntil && otpCode.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil((otpCode.lockedUntil.getTime() - new Date().getTime()) / 60000);
            throw new common_1.BadRequestException(`OTP is locked due to too many failed attempts. Please try again in ${remainingMinutes} minutes`);
        }
        if (otpCode.expiresAt < new Date()) {
            throw new common_1.BadRequestException('OTP has expired. Please request a new one');
        }
        if (otpCode.code !== code) {
            const updatedOtp = await this.incrementFailureCount(otpCode.id);
            if (updatedOtp.failureCount >= this.MAX_FAILURE_COUNT) {
                await this.lockOtp(otpCode.id);
                throw new common_1.BadRequestException(`Too many failed attempts. OTP is locked for ${this.LOCK_DURATION_MINUTES} minutes`);
            }
            throw new common_1.BadRequestException(`Invalid OTP code. ${this.MAX_FAILURE_COUNT - updatedOtp.failureCount} attempts remaining`);
        }
        const verifiedOtp = await this.prisma.otpCode.update({
            where: { id: otpCode.id },
            data: {
                verifiedAt: new Date(),
            },
        });
        return verifiedOtp;
    }
    async incrementFailureCount(otpId) {
        return this.prisma.otpCode.update({
            where: { id: otpId },
            data: {
                failureCount: {
                    increment: 1,
                },
            },
        });
    }
    async lockOtp(otpId) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + this.LOCK_DURATION_MINUTES);
        await this.prisma.otpCode.update({
            where: { id: otpId },
            data: {
                lockedUntil,
            },
        });
    }
    async getRecentOtp(userId, purpose) {
        return this.prisma.otpCode.findFirst({
            where: {
                userId,
                purpose,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async cleanupExpiredOtps() {
        const result = await this.prisma.otpCode.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return result.count;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sms_otp_channel_1.SmsOtpChannel,
        email_otp_channel_1.EmailOtpChannel])
], OtpService);
//# sourceMappingURL=otp.service.js.map