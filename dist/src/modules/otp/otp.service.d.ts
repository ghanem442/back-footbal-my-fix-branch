import { PrismaService } from '@modules/prisma/prisma.service';
import { OtpCode, OtpChannel as PrismaOtpChannel } from '@prisma/client';
import { SmsOtpChannel } from './channels/sms-otp-channel';
import { EmailOtpChannel } from './channels/email-otp-channel';
export declare class OtpService {
    private prisma;
    private smsOtpChannel;
    private emailOtpChannel;
    private readonly OTP_EXPIRATION_MINUTES;
    private readonly COOLDOWN_SECONDS;
    private readonly LOCK_DURATION_MINUTES;
    private readonly MAX_FAILURE_COUNT;
    constructor(prisma: PrismaService, smsOtpChannel: SmsOtpChannel, emailOtpChannel: EmailOtpChannel);
    generateOtp(): string;
    private getChannel;
    createAndSendOtp(userId: string, channel: PrismaOtpChannel, recipient: string, purpose: string): Promise<OtpCode>;
    createOtpCode(userId: string, channel: PrismaOtpChannel, purpose: string): Promise<OtpCode>;
    private validateCooldown;
    verifyOtp(userId: string, code: string, purpose: string): Promise<OtpCode>;
    private incrementFailureCount;
    private lockOtp;
    getRecentOtp(userId: string, purpose: string): Promise<OtpCode | null>;
    cleanupExpiredOtps(): Promise<number>;
}
