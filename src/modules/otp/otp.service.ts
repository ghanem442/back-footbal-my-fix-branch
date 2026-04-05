import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { OtpCode, OtpChannel as PrismaOtpChannel } from '@prisma/client';
import { SmsOtpChannel } from './channels/sms-otp-channel';
import { EmailOtpChannel } from './channels/email-otp-channel';
import { OtpChannel } from './channels/otp-channel.interface';

@Injectable()
export class OtpService {
  private readonly OTP_EXPIRATION_MINUTES = 10;
  private readonly COOLDOWN_SECONDS = 60;
  private readonly LOCK_DURATION_MINUTES = 30;
  private readonly MAX_FAILURE_COUNT = 5;

  constructor(
    private prisma: PrismaService,
    private smsOtpChannel: SmsOtpChannel,
    private emailOtpChannel: EmailOtpChannel,
  ) {}

  /**
   * Generate a 6-digit OTP code
   * @returns A 6-digit numeric string
   */
  generateOtp(): string {
    // Generate a random 6-digit number
    const min = 100000; // Minimum 6-digit number
    const max = 999999; // Maximum 6-digit number
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    return otp.toString();
  }

  /**
   * Get the appropriate OTP channel based on the channel type
   * @param channel - The channel type (SMS or EMAIL)
   * @returns The OTP channel implementation
   */
  private getChannel(channel: PrismaOtpChannel): OtpChannel {
    switch (channel) {
      case 'SMS':
        return this.smsOtpChannel;
      case 'EMAIL':
        return this.emailOtpChannel;
      default:
        throw new BadRequestException(`Unsupported OTP channel: ${channel}`);
    }
  }

  /**
   * Create and send an OTP code
   * @param userId - The user ID to associate with the OTP
   * @param channel - The channel to send the OTP (SMS or EMAIL)
   * @param recipient - The recipient (phone number or email)
   * @param purpose - The purpose of the OTP (e.g., 'registration', 'verification')
   * @returns The created OTP code record
   */
  async createAndSendOtp(
    userId: string,
    channel: PrismaOtpChannel,
    recipient: string,
    purpose: string,
  ): Promise<OtpCode> {
    // Create the OTP code
    const otpCode = await this.createOtpCode(userId, channel, purpose);

    // Send the OTP via the appropriate channel
    const otpChannel = this.getChannel(channel);
    await otpChannel.send(recipient, otpCode.code);

    return otpCode;
  }

  /**
   * Create and store an OTP code in the database
   * @param userId - The user ID to associate with the OTP
   * @param channel - The channel to send the OTP (SMS or EMAIL)
   * @param purpose - The purpose of the OTP (e.g., 'registration', 'verification')
   * @returns The created OTP code record
   */
  async createOtpCode(
    userId: string,
    channel: PrismaOtpChannel,
    purpose: string,
  ): Promise<OtpCode> {
    // Check for cooldown - ensure 60 seconds have passed since last OTP request
    await this.validateCooldown(userId, purpose);

    // Generate the OTP code
    const code = this.generateOtp();

    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRATION_MINUTES);

    // Create the OTP code in the database
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

  /**
   * Validate cooldown period between OTP requests
   * Throws an exception if cooldown period has not elapsed
   * @param userId - The user ID
   * @param purpose - The purpose of the OTP
   */
  private async validateCooldown(
    userId: string,
    purpose: string,
  ): Promise<void> {
    // Find the most recent OTP for this user and purpose
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
      const timeSinceLastOtp =
        (now.getTime() - recentOtp.createdAt.getTime()) / 1000; // in seconds

      if (timeSinceLastOtp < this.COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(
          this.COOLDOWN_SECONDS - timeSinceLastOtp,
        );
        throw new ConflictException(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
        );
      }
    }
  }

  /**
   * Verify an OTP code
   * @param userId - The user ID
   * @param code - The OTP code to verify
   * @param purpose - The purpose of the OTP
   * @returns The verified OTP code record
   */
  async verifyOtp(
    userId: string,
    code: string,
    purpose: string,
  ): Promise<OtpCode> {
    // Find the most recent unverified OTP for this user and purpose
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
      throw new BadRequestException('No OTP found for verification');
    }

    // Check if OTP is locked due to too many failed attempts
    if (otpCode.lockedUntil && otpCode.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (otpCode.lockedUntil.getTime() - new Date().getTime()) / 60000,
      );
      throw new BadRequestException(
        `OTP is locked due to too many failed attempts. Please try again in ${remainingMinutes} minutes`,
      );
    }

    // Check if OTP has expired
    if (otpCode.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    // Verify the code
    if (otpCode.code !== code) {
      // Increment failure count
      const updatedOtp = await this.incrementFailureCount(otpCode.id);

      // Check if we need to lock the OTP
      if (updatedOtp.failureCount >= this.MAX_FAILURE_COUNT) {
        await this.lockOtp(otpCode.id);
        throw new BadRequestException(
          `Too many failed attempts. OTP is locked for ${this.LOCK_DURATION_MINUTES} minutes`,
        );
      }

      throw new BadRequestException(
        `Invalid OTP code. ${this.MAX_FAILURE_COUNT - updatedOtp.failureCount} attempts remaining`,
      );
    }

    // Mark OTP as verified
    const verifiedOtp = await this.prisma.otpCode.update({
      where: { id: otpCode.id },
      data: {
        verifiedAt: new Date(),
      },
    });

    return verifiedOtp;
  }

  /**
   * Increment the failure count for an OTP
   * @param otpId - The OTP ID
   * @returns The updated OTP record
   */
  private async incrementFailureCount(otpId: string): Promise<OtpCode> {
    return this.prisma.otpCode.update({
      where: { id: otpId },
      data: {
        failureCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Lock an OTP due to too many failed attempts
   * @param otpId - The OTP ID
   */
  private async lockOtp(otpId: string): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(
      lockedUntil.getMinutes() + this.LOCK_DURATION_MINUTES,
    );

    await this.prisma.otpCode.update({
      where: { id: otpId },
      data: {
        lockedUntil,
      },
    });
  }

  /**
   * Get the most recent OTP for a user and purpose
   * @param userId - The user ID
   * @param purpose - The purpose of the OTP
   * @returns The OTP code record or null
   */
  async getRecentOtp(
    userId: string,
    purpose: string,
  ): Promise<OtpCode | null> {
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

  /**
   * Clean up expired OTPs (can be called by a background job)
   * @returns The number of deleted OTP records
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
