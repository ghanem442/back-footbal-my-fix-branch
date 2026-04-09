import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@config/config.service';
import { OtpChannel } from './otp-channel.interface';
import * as sgMail from '@sendgrid/mail';

/**
 * Email OTP channel implementation using SendGrid
 * Sends OTP codes via email
 */
@Injectable()
export class EmailOtpChannel implements OtpChannel {
  private readonly logger = new Logger(EmailOtpChannel.name);
  private sendGridConfigured = false;
  private fromEmail: string | null = null;
  private fromName: string | null = null;

  constructor(private configService: AppConfigService) {
    this.initializeSendGrid();
  }

  /**
   * Initialize SendGrid with API key from config
   */
  private initializeSendGrid(): void {
    const apiKey = this.configService.get('email.sendgrid.apiKey');
    this.fromEmail = this.configService.get('email.sendgrid.fromEmail');
    this.fromName =
      this.configService.get('email.sendgrid.fromName') ||
      'Football Field Booking';

    // Only initialize if credentials are properly configured
    if (apiKey && this.fromEmail && apiKey.startsWith('SG.')) {
      try {
        sgMail.setApiKey(apiKey);
        this.sendGridConfigured = true;
        this.logger.log('SendGrid initialized successfully');
      } catch (error) {
        this.logger.warn('SendGrid initialization failed. Email OTP will be logged only.');
      }
    } else {
      this.logger.warn(
        'SendGrid credentials not configured. Email OTP will be logged only.',
      );
    }
  }

  /**
   * Send OTP code via email using SendGrid
   * @param email - The recipient email address
   * @param code - The OTP code to send
   */
  async send(email: string, code: string): Promise<void> {
    const subject = 'Your Verification Code';
    const htmlContent = this.buildEmailHtml(code);
    const textContent = `Your verification code is: ${code}. This code will expire in 10 minutes.`;

    // If SendGrid is not configured, log the email instead
    if (!this.sendGridConfigured || !this.fromEmail) {
      this.logger.log(`
        ========================================
        EMAIL OTP (Development Mode)
        ========================================
        To: ${email}
        From: ${this.fromName} <${this.fromEmail || 'noreply@example.com'}>
        Subject: ${subject}
        
        ${textContent}
        ========================================
      `);
      return;
    }

    try {
      // Send email via SendGrid
      await sgMail.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName || undefined,
        },
        subject,
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Email OTP sent successfully to ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send Email OTP to ${email}: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Failed to send Email OTP: ${errorMessage}`);
    }
  }

  /**
   * Build HTML content for the OTP email
   * @param code - The OTP code
   * @returns HTML string
   */
  private buildEmailHtml(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">Verification Code</h1>
            <p style="font-size: 16px; margin-bottom: 30px;">
              Use the following code to verify your account:
            </p>
            <div style="background-color: #ffffff; border: 2px solid #3498db; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3498db;">
                ${code}
              </span>
            </div>
            <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">
              This code will expire in <strong>10 minutes</strong>.
            </p>
            <p style="font-size: 14px; color: #7f8c8d; margin-top: 10px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #95a5a6;">
            <p>© ${new Date().getFullYear()} Football Field Booking. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}
