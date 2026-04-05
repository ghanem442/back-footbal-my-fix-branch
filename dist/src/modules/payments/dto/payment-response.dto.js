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
exports.RefundResponseDto = exports.PaymentResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class PaymentResponseDto {
}
exports.PaymentResponseDto = PaymentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction ID from the payment gateway',
        example: 'txn_1234567890',
    }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "transactionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment status',
        enum: ['SUCCESS', 'PENDING', 'FAILED'],
        example: 'SUCCESS',
    }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Raw response from the payment gateway',
        example: { charge_id: 'ch_123', receipt_url: 'https://...' },
    }),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "gatewayResponse", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Redirect URL for completing payment (if required)',
        example: 'https://payment-gateway.com/checkout/session_123',
    }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "redirectUrl", void 0);
class RefundResponseDto {
}
exports.RefundResponseDto = RefundResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Refund ID from the payment gateway',
        example: 'refund_1234567890',
    }),
    __metadata("design:type", String)
], RefundResponseDto.prototype, "refundId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Refund status',
        enum: ['SUCCESS', 'PENDING', 'FAILED'],
        example: 'SUCCESS',
    }),
    __metadata("design:type", String)
], RefundResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Refunded amount',
        example: 200.00,
    }),
    __metadata("design:type", Number)
], RefundResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Raw response from the payment gateway',
        example: { refund_id: 'ref_123', status: 'succeeded' },
    }),
    __metadata("design:type", Object)
], RefundResponseDto.prototype, "gatewayResponse", void 0);
//# sourceMappingURL=payment-response.dto.js.map