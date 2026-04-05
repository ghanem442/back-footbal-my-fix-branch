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
exports.UpdatePaymentAccountDto = exports.CreatePaymentAccountDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreatePaymentAccountDto {
}
exports.CreatePaymentAccountDto = CreatePaymentAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment method type',
        enum: ['VODAFONE_CASH', 'INSTAPAY'],
        example: 'VODAFONE_CASH',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['VODAFONE_CASH', 'INSTAPAY']),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Vodafone Cash account number (required for VODAFONE_CASH)',
        example: '01012345678',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.ValidateIf)((o) => o.paymentMethod === 'VODAFONE_CASH'),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay account name (required for INSTAPAY)',
        example: 'John Doe',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.ValidateIf)((o) => o.paymentMethod === 'INSTAPAY'),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay mobile number (required for INSTAPAY)',
        example: '01012345678',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.ValidateIf)((o) => o.paymentMethod === 'INSTAPAY'),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "mobileNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay Payment Address (IPN)',
        example: 'johndoe@instapay',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "ipn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Bank account number (optional)',
        example: '1234567890',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentAccountDto.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether this payment method is active',
        example: true,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePaymentAccountDto.prototype, "isActive", void 0);
class UpdatePaymentAccountDto {
}
exports.UpdatePaymentAccountDto = UpdatePaymentAccountDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Vodafone Cash account number',
        example: '01012345678',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentAccountDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay account name',
        example: 'John Doe',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentAccountDto.prototype, "accountName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay mobile number',
        example: '01012345678',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentAccountDto.prototype, "mobileNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'InstaPay Payment Address (IPN)',
        example: 'johndoe@instapay',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentAccountDto.prototype, "ipn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Bank account number',
        example: '1234567890',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentAccountDto.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether this payment method is active',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePaymentAccountDto.prototype, "isActive", void 0);
//# sourceMappingURL=payment-account-settings.dto.js.map