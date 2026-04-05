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
exports.PlatformWalletWithdrawDto = exports.WalletProvider = exports.PayoutMethod = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var PayoutMethod;
(function (PayoutMethod) {
    PayoutMethod["MOBILE_WALLET"] = "MOBILE_WALLET";
    PayoutMethod["INSTAPAY"] = "INSTAPAY";
})(PayoutMethod || (exports.PayoutMethod = PayoutMethod = {}));
var WalletProvider;
(function (WalletProvider) {
    WalletProvider["VODAFONE"] = "VODAFONE";
    WalletProvider["ORANGE"] = "ORANGE";
    WalletProvider["ETISALAT"] = "ETISALAT";
    WalletProvider["WE"] = "WE";
})(WalletProvider || (exports.WalletProvider = WalletProvider = {}));
class PlatformWalletWithdrawDto {
    constructor() {
        this.amount = 0;
        this.payoutMethod = PayoutMethod.MOBILE_WALLET;
        this.accountHolderName = '';
    }
}
exports.PlatformWalletWithdrawDto = PlatformWalletWithdrawDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], PlatformWalletWithdrawDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Platform withdrawal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'PLATFORM-W-001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayoutMethod, example: PayoutMethod.MOBILE_WALLET }),
    (0, class_validator_1.IsEnum)(PayoutMethod),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "payoutMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '01012345678' }),
    (0, class_validator_1.ValidateIf)((o) => o.payoutMethod === PayoutMethod.MOBILE_WALLET),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: WalletProvider, example: WalletProvider.VODAFONE }),
    (0, class_validator_1.ValidateIf)((o) => o.payoutMethod === PayoutMethod.MOBILE_WALLET),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(WalletProvider),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "walletProvider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'name@instapay' }),
    (0, class_validator_1.ValidateIf)((o) => o.payoutMethod === PayoutMethod.INSTAPAY),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "accountDetails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Admin Name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlatformWalletWithdrawDto.prototype, "accountHolderName", void 0);
//# sourceMappingURL=platform-wallet-withdraw.dto.js.map