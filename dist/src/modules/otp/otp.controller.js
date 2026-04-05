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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const otp_service_1 = require("./otp.service");
const users_service_1 = require("../users/users.service");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const verify_otp_dto_1 = require("./dto/verify-otp.dto");
let OtpController = class OtpController {
    constructor(otpService, usersService) {
        this.otpService = otpService;
        this.usersService = usersService;
    }
    async sendOtp(sendOtpDto) {
        const user = await this.usersService.findById(sendOtpDto.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.isVerified) {
            throw new common_1.BadRequestException('User is already verified');
        }
        let recipient;
        if (sendOtpDto.channel === 'SMS') {
            if (!user.phoneNumber) {
                throw new common_1.BadRequestException('User does not have a phone number');
            }
            recipient = user.phoneNumber;
        }
        else if (sendOtpDto.channel === 'EMAIL') {
            if (!user.email) {
                throw new common_1.BadRequestException('User does not have an email address');
            }
            recipient = user.email;
        }
        else {
            throw new common_1.BadRequestException('Invalid OTP channel');
        }
        await this.otpService.createAndSendOtp(sendOtpDto.userId, sendOtpDto.channel, recipient, sendOtpDto.purpose);
        return {
            success: true,
            message: `OTP sent successfully via ${sendOtpDto.channel}`,
        };
    }
    async verifyOtp(verifyOtpDto) {
        const user = await this.usersService.findById(verifyOtpDto.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.otpService.verifyOtp(verifyOtpDto.userId, verifyOtpDto.code, verifyOtpDto.purpose);
        await this.usersService.markAsVerified(verifyOtpDto.userId);
        return {
            success: true,
            message: 'OTP verified successfully. User is now verified.',
        };
    }
};
exports.OtpController = OtpController;
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Send OTP',
        description: 'Generate and send a 6-digit OTP via SMS or Email. OTP expires in 10 minutes. Rate limited to prevent abuse.',
    }),
    (0, swagger_1.ApiBody)({ type: send_otp_dto_1.SendOtpDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'OTP sent successfully',
        schema: {
            example: {
                success: true,
                message: 'OTP sent successfully via SMS',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'User already verified or missing contact information',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found',
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify OTP',
        description: 'Verify OTP code and mark user as verified. OTP is single-use and expires after 10 minutes. Locked after 5 failed attempts.',
    }),
    (0, swagger_1.ApiBody)({ type: verify_otp_dto_1.VerifyOtpDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'OTP verified successfully',
        schema: {
            example: {
                success: true,
                message: 'OTP verified successfully. User is now verified.',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid OTP, expired OTP, or OTP locked due to too many attempts',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found',
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "verifyOtp", null);
exports.OtpController = OtpController = __decorate([
    (0, swagger_1.ApiTags)('OTP'),
    (0, common_1.Controller)('otp'),
    __metadata("design:paramtypes", [otp_service_1.OtpService,
        users_service_1.UsersService])
], OtpController);
//# sourceMappingURL=otp.controller.js.map