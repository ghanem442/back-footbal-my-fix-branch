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
var SmsOtpChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsOtpChannel = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("../../../config/config.service");
const twilio_1 = require("twilio");
let SmsOtpChannel = SmsOtpChannel_1 = class SmsOtpChannel {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SmsOtpChannel_1.name);
        this.twilioClient = null;
        this.fromPhoneNumber = null;
        this.initializeTwilio();
    }
    initializeTwilio() {
        const accountSid = this.configService.get('sms.twilio.accountSid');
        const authToken = this.configService.get('sms.twilio.authToken');
        this.fromPhoneNumber = this.configService.get('sms.twilio.phoneNumber');
        if (accountSid && authToken && this.fromPhoneNumber) {
            this.twilioClient = new twilio_1.Twilio(accountSid, authToken);
            this.logger.log('Twilio client initialized successfully');
        }
        else {
            this.logger.warn('Twilio credentials not configured. SMS OTP will be logged only.');
        }
    }
    async send(phoneNumber, code) {
        const message = `Your verification code is: ${code}. This code will expire in 10 minutes.`;
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
            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.fromPhoneNumber,
                to: phoneNumber,
            });
            this.logger.log(`SMS OTP sent successfully to ${phoneNumber}. SID: ${result.sid}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to send SMS OTP to ${phoneNumber}: ${errorMessage}`, errorStack);
            throw new Error(`Failed to send SMS OTP: ${errorMessage}`);
        }
    }
};
exports.SmsOtpChannel = SmsOtpChannel;
exports.SmsOtpChannel = SmsOtpChannel = SmsOtpChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], SmsOtpChannel);
//# sourceMappingURL=sms-otp-channel.js.map