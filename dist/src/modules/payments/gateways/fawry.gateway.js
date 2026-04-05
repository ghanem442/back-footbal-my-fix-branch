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
exports.FawryGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const base_payment_gateway_1 = require("./base-payment-gateway");
let FawryGateway = class FawryGateway extends base_payment_gateway_1.BasePaymentGateway {
    constructor(configService) {
        super('Fawry');
        this.configService = configService;
        this.isConfigured = false;
        this.merchantCode = this.configService.get('FAWRY_MERCHANT_CODE') || '';
        this.securityKey = this.configService.get('FAWRY_SECRET_KEY') || '';
        this.baseUrl = this.configService.get('FAWRY_BASE_URL') || 'https://atfawry.fawrystaging.com';
        if (this.merchantCode && this.securityKey &&
            this.merchantCode !== 'your-fawry-merchant-code' &&
            this.securityKey !== 'your-fawry-secret-key') {
            this.isConfigured = true;
            this.logger.log('Fawry gateway initialized successfully');
        }
        else {
            this.logger.warn('Fawry credentials not configured. Fawry payments will not be available.');
        }
        this.httpClient = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    ensureConfigured() {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Fawry payment gateway is not configured. Please configure FAWRY_MERCHANT_CODE and FAWRY_SECRET_KEY in environment variables.');
        }
    }
    async processPayment(request) {
        this.ensureConfigured();
        this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
        try {
            const merchantRefNumber = `${request.bookingId}-${Date.now()}`;
            const chargeItems = [
                {
                    itemId: request.bookingId,
                    description: `Booking ${request.bookingId}`,
                    price: request.amount,
                    quantity: 1,
                },
            ];
            const signature = this.generateSignature(merchantRefNumber, request.userId, request.amount);
            const payload = {
                merchantCode: this.merchantCode,
                merchantRefNumber,
                customerProfileId: request.userId,
                customerMobile: request.metadata?.phoneNumber || '',
                customerEmail: request.metadata?.email || '',
                paymentMethod: 'PAYATFAWRY',
                amount: request.amount,
                currencyCode: request.currency,
                chargeItems,
                signature,
                description: `Football field booking ${request.bookingId}`,
                paymentExpiry: Date.now() + 24 * 60 * 60 * 1000,
            };
            const response = await this.httpClient.post('/ECommerceWeb/Fawry/payments/charge', payload);
            return {
                transactionId: response.data.referenceNumber || merchantRefNumber,
                status: this.mapFawryStatus(response.data.paymentStatus),
                gatewayResponse: response.data,
                redirectUrl: response.data.paymentUrl,
            };
        }
        catch (error) {
            this.logPaymentError('processPayment', error);
            throw new common_1.InternalServerErrorException(`Fawry payment failed: ${error.message}`);
        }
    }
    async handleWebhook(payload, signature) {
        this.ensureConfigured();
        this.logPaymentOperation('handleWebhook', { referenceNumber: payload?.referenceNumber });
        try {
            const expectedSignature = this.generateCallbackSignature(payload.merchantRefNumber, payload.orderAmount);
            if (payload.messageSignature !== expectedSignature) {
                throw new common_1.BadRequestException('Invalid callback signature');
            }
            const bookingId = payload.merchantRefNumber?.split('-')[0];
            return {
                transactionId: payload.referenceNumber,
                status: this.mapFawryStatus(payload.orderStatus),
                bookingId,
                metadata: {
                    amount: payload.orderAmount,
                    paymentMethod: payload.paymentMethod,
                    paymentTime: payload.paymentTime,
                },
            };
        }
        catch (error) {
            this.logPaymentError('handleWebhook', error);
            throw error;
        }
    }
    async refund(transactionId, amount) {
        this.ensureConfigured();
        this.logPaymentOperation('refund', { transactionId, amount });
        try {
            const refundReference = `REF-${transactionId}-${Date.now()}`;
            const signature = this.generateRefundSignature(transactionId, refundReference, amount);
            const payload = {
                merchantCode: this.merchantCode,
                referenceNumber: transactionId,
                refundReference,
                refundAmount: amount,
                signature,
            };
            const response = await this.httpClient.post('/ECommerceWeb/Fawry/payments/refund', payload);
            return {
                refundId: response.data.refundReference || refundReference,
                status: this.mapRefundStatus(response.data.status),
                amount,
                gatewayResponse: response.data,
            };
        }
        catch (error) {
            this.logPaymentError('refund', error);
            throw new common_1.InternalServerErrorException(`Fawry refund failed: ${error.message}`);
        }
    }
    generateSignature(merchantRefNumber, customerId, amount) {
        const signatureString = `${this.merchantCode}${merchantRefNumber}${customerId}${amount}${this.securityKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    generateCallbackSignature(merchantRefNumber, amount) {
        const signatureString = `${this.merchantCode}${merchantRefNumber}${amount}${this.securityKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    generateRefundSignature(referenceNumber, refundReference, amount) {
        const signatureString = `${this.merchantCode}${referenceNumber}${refundReference}${amount}${this.securityKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    mapFawryStatus(status) {
        switch (status?.toUpperCase()) {
            case 'PAID':
            case 'SUCCESS':
                return 'SUCCESS';
            case 'UNPAID':
            case 'PENDING':
            case 'NEW':
                return 'PENDING';
            case 'FAILED':
            case 'CANCELED':
            case 'EXPIRED':
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
exports.FawryGateway = FawryGateway;
exports.FawryGateway = FawryGateway = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FawryGateway);
//# sourceMappingURL=fawry.gateway.js.map