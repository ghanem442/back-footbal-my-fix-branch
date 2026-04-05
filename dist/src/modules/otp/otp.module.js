"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpModule = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("./otp.service");
const otp_controller_1 = require("./otp.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const config_module_1 = require("../../config/config.module");
const users_module_1 = require("../users/users.module");
const sms_otp_channel_1 = require("./channels/sms-otp-channel");
const email_otp_channel_1 = require("./channels/email-otp-channel");
let OtpModule = class OtpModule {
};
exports.OtpModule = OtpModule;
exports.OtpModule = OtpModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_module_1.AppConfigModule, users_module_1.UsersModule],
        controllers: [otp_controller_1.OtpController],
        providers: [otp_service_1.OtpService, sms_otp_channel_1.SmsOtpChannel, email_otp_channel_1.EmailOtpChannel],
        exports: [otp_service_1.OtpService, sms_otp_channel_1.SmsOtpChannel, email_otp_channel_1.EmailOtpChannel],
    })
], OtpModule);
//# sourceMappingURL=otp.module.js.map