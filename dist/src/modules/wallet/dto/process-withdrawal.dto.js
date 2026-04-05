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
exports.ProcessWithdrawalDto = exports.MobileWalletDetailsDto = exports.BankAccountDetailsDto = exports.WithdrawalGateway = exports.WithdrawalMethod = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var WithdrawalMethod;
(function (WithdrawalMethod) {
    WithdrawalMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    WithdrawalMethod["MOBILE_WALLET"] = "MOBILE_WALLET";
    WithdrawalMethod["STRIPE_CONNECT"] = "STRIPE_CONNECT";
    WithdrawalMethod["FAWRY_PAYOUT"] = "FAWRY_PAYOUT";
    WithdrawalMethod["VODAFONE_CASH"] = "VODAFONE_CASH";
    WithdrawalMethod["INSTAPAY"] = "INSTAPAY";
})(WithdrawalMethod || (exports.WithdrawalMethod = WithdrawalMethod = {}));
var WithdrawalGateway;
(function (WithdrawalGateway) {
    WithdrawalGateway["STRIPE"] = "stripe";
    WithdrawalGateway["FAWRY"] = "fawry";
    WithdrawalGateway["VODAFONE"] = "vodafone";
    WithdrawalGateway["INSTAPAY"] = "instapay";
})(WithdrawalGateway || (exports.WithdrawalGateway = WithdrawalGateway = {}));
class BankAccountDetailsDto {
}
exports.BankAccountDetailsDto = BankAccountDetailsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank account number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "bankAccountNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank code or routing number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "bankCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Account holder name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "accountHolderName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'IBAN (International Bank Account Number)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SWIFT/BIC code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BankAccountDetailsDto.prototype, "swiftCode", void 0);
class MobileWalletDetailsDto {
}
exports.MobileWalletDetailsDto = MobileWalletDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Mobile phone number' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MobileWalletDetailsDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Wallet provider name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MobileWalletDetailsDto.prototype, "walletProvider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Account holder name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MobileWalletDetailsDto.prototype, "name", void 0);
class ProcessWithdrawalDto {
}
exports.ProcessWithdrawalDto = ProcessWithdrawalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount to withdraw', example: 100.00, minimum: 0.01 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], ProcessWithdrawalDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Withdrawal method',
        enum: WithdrawalMethod,
        example: WithdrawalMethod.BANK_TRANSFER
    }),
    (0, class_validator_1.IsEnum)(WithdrawalMethod),
    __metadata("design:type", String)
], ProcessWithdrawalDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment gateway to use',
        enum: WithdrawalGateway,
        example: WithdrawalGateway.STRIPE
    }),
    (0, class_validator_1.IsEnum)(WithdrawalGateway),
    __metadata("design:type", String)
], ProcessWithdrawalDto.prototype, "gateway", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Bank account details (required for bank transfers)',
        type: BankAccountDetailsDto
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BankAccountDetailsDto),
    __metadata("design:type", BankAccountDetailsDto)
], ProcessWithdrawalDto.prototype, "bankDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Mobile wallet details (required for mobile wallet withdrawals)',
        type: MobileWalletDetailsDto
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MobileWalletDetailsDto),
    __metadata("design:type", MobileWalletDetailsDto)
], ProcessWithdrawalDto.prototype, "mobileWalletDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Stripe connected account ID (for Stripe Connect)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessWithdrawalDto.prototype, "stripeConnectedAccountId", void 0);
//# sourceMappingURL=process-withdrawal.dto.js.map