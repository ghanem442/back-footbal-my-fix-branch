import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@config/config.service';
import { OtpChannel } from './otp-channel.interface';
import { Twilio } from 'twilio';

/**
 * SMS OTP channel implementation using Twilio
 * Sends OTP codes via SMS to phone numbers
 */
@Injectable()
export class SmsOtpChannel implements OtpChannel {
  private readonly logger = new Logger(SmsOtpChannel.name);
  private twilioClient: Twilio | null = null;
  private fromPhoneNumber: string | null = null;

  constructor(private configService: AppConfigService) {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client with credentials from config
   */
  private initializeTwilio(): void {
    const accountSid = this.configService.get('sms.twilio.accountSid');
    const authToken = this.configService.get('sms.twilio.authToken');
    this.fromPhoneNumber = this.configService.get('sms.twilio.phoneNumber');

    if (accountSid && authToken && this.fromPhoneNumber) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio client initialized successfully');
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS OTP will be logged only.',
      );
    }
  }

  /**
   * Send OTP code via SMS using Twilio
   * @param phoneNumber - The recipient phone number (E.164 format)
   * @param code - The OTP code to send
   */
  async send(phoneNumber: string, code: string): Promise<void> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;

    // If Twilio is not configured, log the message instead
    if (!this.twilioClient || !this.fromPhoneNumber) {
      this.logger.log(`
        ========================================
        SMS OTP (Development Mode)
        ========================================
        To: ${phoneNumber}
        Message: ${message}
        ========================================
      `);
      return;
    }

    try {
      // Send SMS via Twilio
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: phoneNumber,
      });

      this.logger.log(
        `SMS OTP sent successfully to ${phoneNumber}. SID: ${result.sid}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send SMS OTP to ${phoneNumber}: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to send SMS OTP: ${errorMessage}`);
    }
  }
}
