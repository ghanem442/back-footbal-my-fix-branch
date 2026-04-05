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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("../../config/config.service");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = null;
        this.initializeTransporter();
    }
    initializeTransporter() {
        const smtpHost = this.configService.get('SMTP_HOST');
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');
        if (smtpHost && smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(this.configService.get('SMTP_PORT') || '587'),
                secure: this.configService.get('SMTP_SECURE') === 'true',
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            this.logger.log('✅ SMTP Email service initialized');
        }
        else {
            this.logger.warn('⚠️ No SMTP configuration found');
        }
    }
    async sendEmailVerification(email, verificationToken) {
        const baseUrl = this.configService.get('app.backendUrl') || 'http://localhost:3000';
        const verifyUrl = `${baseUrl}/api/v1/auth/verify-email?token=${verificationToken}`;
        const subject = 'Verify Your Email Address';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Football Booking!</h2>
        <p>Thank you for registering. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
        <p style="color: #999; font-size: 12px;">If you did not create an account, please ignore this email.</p>
      </div>
    `;
        const text = `Welcome to Football Booking! Please verify your email address by visiting: ${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`;
        if (this.transporter) {
            try {
                const fromEmail = this.configService.get('SMTP_FROM_EMAIL') || 'noreply@example.com';
                const fromName = this.configService.get('SMTP_FROM_NAME') || 'Football Booking';
                await this.transporter.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to: email,
                    subject,
                    html,
                    text,
                });
                this.logger.log(`✅ Email verification sent to ${email} via SMTP`);
                return;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`❌ Failed to send email via SMTP: ${errorMessage}`);
            }
        }
        const sendgridApiKey = this.configService.get('SENDGRID_API_KEY');
        if (sendgridApiKey) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(sendgridApiKey);
                const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@example.com';
                const fromName = this.configService.get('SENDGRID_FROM_NAME') || 'Football Booking';
                await sgMail.send({
                    to: email,
                    from: {
                        email: fromEmail,
                        name: fromName,
                    },
                    subject,
                    html,
                    text,
                });
                this.logger.log(`✅ Email verification sent to ${email} via SendGrid`);
                return;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`❌ Failed to send verification email via SendGrid: ${errorMessage}`);
            }
        }
        this.logger.warn('⚠️ No email service configured. Logging email instead.');
        this.logVerificationEmail(email, verifyUrl);
    }
    logVerificationEmail(to, verifyUrl) {
        this.logger.log(`
      ========================================
      EMAIL (NOT SENT - NO EMAIL SERVICE CONFIGURED)
      ========================================
      To: ${to}
      Subject: Verify Your Email Address
      
      Welcome to Football Booking!
      
      Please verify your email address by clicking the link below:
      ${verifyUrl}
      
      This link will expire in 24 hours.
      
      If you did not create an account, please ignore this email.
      ========================================
    `);
    }
    async sendPasswordResetEmail(email, resetToken, resetUrl) {
        const baseUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3000';
        const fullResetUrl = resetUrl || `${baseUrl}/reset-password?token=${resetToken}`;
        const sendgridApiKey = this.configService.get('SENDGRID_API_KEY');
        if (sendgridApiKey) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(sendgridApiKey);
                const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@example.com';
                const fromName = this.configService.get('SENDGRID_FROM_NAME') || 'Football Booking';
                await sgMail.send({
                    to: email,
                    from: {
                        email: fromEmail,
                        name: fromName,
                    },
                    subject: 'Password Reset Request',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>You have requested to reset your password.</p>
              <p>Please click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${fullResetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${fullResetUrl}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
              <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
            </div>
          `,
                    text: `You have requested to reset your password. Please visit the following link to reset your password: ${fullResetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
                });
                this.logger.log(`Password reset email sent to ${email} via SendGrid`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to send email via SendGrid: ${errorMessage}`);
                this.logEmail(email, 'Password Reset Request', fullResetUrl);
            }
        }
        else {
            this.logger.warn('SendGrid not configured. Logging email instead.');
            this.logEmail(email, 'Password Reset Request', fullResetUrl);
        }
    }
    logEmail(to, subject, resetUrl) {
        this.logger.log(`
      ========================================
      EMAIL (NOT SENT - NO EMAIL SERVICE CONFIGURED)
      ========================================
      To: ${to}
      Subject: ${subject}
      
      You have requested to reset your password.
      
      Please click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request this, please ignore this email.
      ========================================
    `);
    }
    async sendPasswordResetConfirmation(email) {
        const sendgridApiKey = this.configService.get('SENDGRID_API_KEY');
        if (sendgridApiKey) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(sendgridApiKey);
                const fromEmail = this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@example.com';
                const fromName = this.configService.get('SENDGRID_FROM_NAME') || 'Football Booking';
                await sgMail.send({
                    to: email,
                    from: {
                        email: fromEmail,
                        name: fromName,
                    },
                    subject: 'Password Reset Successful',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Successful</h2>
              <p>Your password has been successfully reset.</p>
              <p>You can now log in with your new password.</p>
              <p style="color: #d32f2f; margin-top: 30px;">⚠️ If you did not make this change, please contact support immediately.</p>
            </div>
          `,
                    text: `Your password has been successfully reset.\n\nYou can now log in with your new password.\n\nIf you did not make this change, please contact support immediately.`,
                });
                this.logger.log(`Password reset confirmation email sent to ${email} via SendGrid`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to send confirmation email via SendGrid: ${errorMessage}`);
                this.logConfirmationEmail(email);
            }
        }
        else {
            this.logger.warn('SendGrid not configured. Logging email instead.');
            this.logConfirmationEmail(email);
        }
    }
    logConfirmationEmail(to) {
        this.logger.log(`
      ========================================
      EMAIL (NOT SENT - NO EMAIL SERVICE CONFIGURED)
      ========================================
      To: ${to}
      Subject: Password Reset Successful
      
      Your password has been successfully reset.
      
      If you did not make this change, please contact support immediately.
      ========================================
    `);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map