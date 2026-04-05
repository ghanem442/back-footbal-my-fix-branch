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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VodafoneCashGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const base_payment_gateway_1 = require("./base-payment-gateway");
let VodafoneCashGateway = class VodafoneCashGateway extends base_payment_gateway_1.BasePaymentGateway {
    constructor(configService) {
        super('VodafoneCash');
        this.configService = configService;
        this.merchantId = this.configService.get('VODAFONE_MERCHANT_ID') || '';
        this.apiKey = this.configService.get('VODAFONE_API_KEY') || '';
        this.secretKey = this.configService.get('VODAFONE_SECRET_KEY') || '';
        this.baseUrl = this.configService.get('VODAFONE_BASE_URL') || 'https://api.vodafone.com.eg';
        if (!this.merchantId || !this.apiKey || !this.secretKey) {
            this.logger.warn('Vodafone Cash credentials not configured');
        }
        this.httpClient = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
            },
        });
    }
    async processPayment(request) {
        this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
        try {
            const transactionRef = `VF-${request.bookingId}-${Date.now()}`;
            const signature = this.generateSignature(transactionRef, request.amount);
            const payload = {
                merchantId: this.merchantId,
                transactionRef,
                amount: request.amount,
                currency: request.currency,
                customerMobile: request.metadata?.phoneNumber || '',
                customerEmail: request.metadata?.email || '',
                description: `Booking ${request.bookingId}`,
                callbackUrl: request.metadata?.callbackUrl || '',
                signature,
                metadata: {
                    bookingId: request.bookingId,
                    userId: request.userId,
                },
            };
            const response = await this.httpClient.post('/payment/v1/initiate', payload);
            return {
                transactionId: response.data.transactionId || transactionRef,
                status: this.mapVodafoneStatus(response.data.status),
                gatewayResponse: response.data,
                redirectUrl: response.data.paymentUrl || response.data.ussdCode,
            };
        }
        catch (error) {
            this.logPaymentError('processPayment', error);
            throw new common_1.InternalServerErrorException(`Vodafone Cash payment failed: ${error.message}`);
        }
    }
    async handleWebhook(payload, signature) {
        this.logPaymentOperation('handleWebhook', { transactionId: payload?.transactionId });
        try {
            const expectedSignature = this.generateCallbackSignature(payload.transactionId, payload.amount, payload.status);
            if (payload.signature !== expectedSignature) {
                throw new common_1.BadRequestException('Invalid callback signature');
            }
            return {
                transactionId: payload.transactionId,
                status: this.mapVodafoneStatus(payload.status),
                bookingId: payload.metadata?.bookingId,
                metadata: {
                    amount: payload.amount,
                    currency: payload.currency,
                    paymentMethod: 'VODAFONE_CASH',
                    timestamp: payload.timestamp,
                },
            };
        }
        catch (error) {
            this.logPaymentError('handleWebhook', error);
            throw error;
        }
    }
    async refund(transactionId, amount) {
        this.logPaymentOperation('refund', { transactionId, amount });
        try {
            const refundRef = `REFUND-${transactionId}-${Date.now()}`;
            const signature = this.generateRefundSignature(transactionId, refundRef, amount);
            const payload = {
                merchantId: this.merchantId,
                originalTransactionId: transactionId,
                refundReference: refundRef,
                amount,
                signature,
            };
            const response = await this.httpClient.post('/payment/v1/refund', payload);
            return {
                refundId: response.data.refundId || refundRef,
                status: this.mapRefundStatus(response.data.status),
                amount,
                gatewayResponse: response.data,
            };
        }
        catch (error) {
            this.logPaymentError('refund', error);
            throw new common_1.InternalServerErrorException(`Vodafone Cash refund failed: ${error.message}`);
        }
    }
    generateSignature(transactionRef, amount) {
        const signatureString = `${this.merchantId}${transactionRef}${amount}${this.secretKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    generateCallbackSignature(transactionId, amount, status) {
        const signatureString = `${transactionId}${amount}${status}${this.secretKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    generateRefundSignature(transactionId, refundRef, amount) {
        const signatureString = `${this.merchantId}${transactionId}${refundRef}${amount}${this.secretKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    mapVodafoneStatus(status) {
        switch (status?.toUpperCase()) {
            case 'SUCCESS':
            case 'COMPLETED':
            case 'PAID':
                return 'SUCCESS';
            case 'PENDING':
            case 'INITIATED':
            case 'PROCESSING':
                return 'PENDING';
            case 'FAILED':
            case 'CANCELLED':
            case 'EXPIRED':
            case 'REJECTED':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
    mapRefundStatus(status) {
        switch (status?.toUpperCase()) {
            case 'SUCCESS':
            case 'COMPLETED':
                return 'SUCCESS';
            case 'PENDING':
            case 'PROCESSING':
                return 'PENDING';
            case 'FAILED':
            case 'REJECTED':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
};
exports.VodafoneCashGateway = VodafoneCashGateway;
exports.VodafoneCashGateway = VodafoneCashGateway = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VodafoneCashGateway);
//# sourceMappingURL=vodafone-cash.gateway.js.map