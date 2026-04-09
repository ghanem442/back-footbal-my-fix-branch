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
var EmailOtpChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOtpChannel = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("../../../config/config.service");
const sgMail = __importStar(require("@sendgrid/mail"));
let EmailOtpChannel = EmailOtpChannel_1 = class EmailOtpChannel {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailOtpChannel_1.name);
        this.sendGridConfigured = false;
        this.fromEmail = null;
        this.fromName = null;
        this.initializeSendGrid();
    }
    initializeSendGrid() {
        const apiKey = this.configService.get('email.sendgrid.apiKey');
        this.fromEmail = this.configService.get('email.sendgrid.fromEmail');
        this.fromName =
            this.configService.get('email.sendgrid.fromName') ||
                'Football Field Booking';
        if (apiKey && this.fromEmail && apiKey.startsWith('SG.')) {
            try {
                sgMail.setApiKey(apiKey);
                this.sendGridConfigured = true;
                this.logger.log('SendGrid initialized successfully');
            }
            catch (error) {
                this.logger.warn('SendGrid initialization failed. Email OTP will be logged only.');
            }
        }
        else {
            this.logger.warn('SendGrid credentials not configured. Email OTP will be logged only.');
        }
    }
    async send(email, code) {
        const subject = 'Your Verification Code';
        const htmlContent = this.buildEmailHtml(code);
        const textContent = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to send Email OTP to ${email}: ${errorMessage}`, errorStack);
            throw new Error(`Failed to send Email OTP: ${errorMessage}`);
        }
    }
    buildEmailHtml(code) {
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
};
exports.EmailOtpChannel = EmailOtpChannel;
exports.EmailOtpChannel = EmailOtpChannel = EmailOtpChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], EmailOtpChannel);
//# sourceMappingURL=email-otp-channel.js.map