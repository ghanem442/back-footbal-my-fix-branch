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
var FawryPayoutGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FawryPayoutGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const common_2 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const payout_gateway_interface_1 = require("../interfaces/payout-gateway.interface");
let FawryPayoutGateway = FawryPayoutGateway_1 = class FawryPayoutGateway {
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = 'https://atfawry.fawrystaging.com/ECommerceWeb/api';
        this.isConfigured = false;
        this.logger = new common_2.Logger(FawryPayoutGateway_1.name);
        this.merchantCode = this.configService.get('FAWRY_MERCHANT_CODE') || '';
        this.secretKey = this.configService.get('FAWRY_SECRET_KEY') || '';
        if (this.merchantCode && this.merchantCode !== 'your-fawry-merchant-code' && this.secretKey) {
            this.isConfigured = true;
            this.logger.log('Fawry payout gateway initialized successfully');
        }
        else {
            this.logger.warn('Fawry credentials not configured. Fawry payouts will not be available.');
        }
    }
    ensureConfigured() {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Fawry payout gateway is not configured');
        }
    }
    async processPayout(request) {
        this.ensureConfigured();
        this.logger.log(`Processing Fawry payout for user ${request.userId}, amount: ${request.amount}`);
        try {
            if (request.paymentMethod === payout_gateway_interface_1.PayoutMethod.BANK_TRANSFER) {
                return await this.processBankPayout(request);
            }
            else if (request.paymentMethod === payout_gateway_interface_1.PayoutMethod.MOBILE_WALLET) {
                return await this.processMobileWalletPayout(request);
            }
            else {
                throw new common_1.BadRequestException('Unsupported payout method for Fawry');
            }
        }
        catch (error) {
            this.logger.error(`Fawry payout failed: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Fawry payout failed: ${error.message}`);
        }
    }
    async processBankPayout(request) {
        const payoutId = `PAYOUT_${Date.now()}_${request.userId}`;
        const payload = {
            merchantCode: this.merchantCode,
            merchantRefNumber: payoutId,
            amount: request.amount,
            currency: request.currency,
            recipientType: 'BANK_ACCOUNT',
            recipientDetails: {
                accountNumber: request.recipientDetails.bankAccountNumber,
                bankCode: request.recipientDetails.bankCode,
                accountHolderName: request.recipientDetails.accountHolderName,
                iban: request.recipientDetails.iban,
            },
            description: `Payout to ${request.recipientDetails.accountHolderName}`,
        };
        const signature = this.generateSignature(payload);
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/payout/disburse`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Signature': signature,
                },
            });
            return {
                payoutId: response.data.referenceNumber || payoutId,
                status: this.mapFawryStatus(response.data.status),
                gatewayResponse: response.data,
                estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                fee: response.data.fee || 0,
            };
        }
        catch (error) {
            this.logger.error(`Fawry bank payout API error: ${error.message}`);
            return {
                payoutId,
                status: 'PENDING',
                gatewayResponse: { error: error.message, demo: true },
                estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                fee: 0,
            };
        }
    }
    async processMobileWalletPayout(request) {
        const payoutId = `PAYOUT_${Date.now()}_${request.userId}`;
        const payload = {
            merchantCode: this.merchantCode,
            merchantRefNumber: payoutId,
            amount: request.amount,
            currency: request.currency,
            recipientType: 'MOBILE_WALLET',
            recipientDetails: {
                phoneNumber: request.recipientDetails.phoneNumber,
                walletProvider: request.recipientDetails.walletProvider || 'FAWRY',
                name: request.recipientDetails.name,
            },
            description: `Payout to ${request.recipientDetails.name}`,
        };
        const signature = this.generateSignature(payload);
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/payout/disburse`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Signature': signature,
                },
            });
            return {
                payoutId: response.data.referenceNumber || payoutId,
                status: this.mapFawryStatus(response.data.status),
                gatewayResponse: response.data,
                estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
                fee: response.data.fee || 0,
            };
        }
        catch (error) {
            this.logger.error(`Fawry mobile wallet payout API error: ${error.message}`);
            return {
                payoutId,
                status: 'PENDING',
                gatewayResponse: { error: error.message, demo: true },
                estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
                fee: 0,
            };
        }
    }
    async getPayoutStatus(payoutId) {
        this.ensureConfigured();
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/payout/status/${payoutId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'MerchantCode': this.merchantCode,
                },
            });
            return {
                payoutId: response.data.referenceNumber,
                status: this.mapFawryStatus(response.data.status),
                amount: response.data.amount,
                currency: response.data.currency,
                createdAt: new Date(response.data.createdAt),
                completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
                failureReason: response.data.failureReason,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get Fawry payout status: ${error.message}`);
            return {
                payoutId,
                status: 'PENDING',
                amount: 0,
                currency: 'EGP',
                createdAt: new Date(),
            };
        }
    }
    generateSignature(payload) {
        const signatureString = `${this.merchantCode}${payload.merchantRefNumber}${payload.amount}${this.secretKey}`;
        return crypto.createHash('sha256').update(signatureString).digest('hex');
    }
    mapFawryStatus(status) {
        switch (status?.toUpperCase()) {
            case 'SUCCESS':
            case 'COMPLETED':
            case 'PAID':
                return 'SUCCESS';
            case 'PENDING':
            case 'PROCESSING':
            case 'IN_PROGRESS':
                return 'PENDING';
            case 'FAILED':
            case 'REJECTED':
                return 'FAILED';
            case 'CANCELLED':
            case 'CANCELED':
                return 'CANCELLED';
            default:
                return 'PENDING';
        }
    }
};
exports.FawryPayoutGateway = FawryPayoutGateway;
exports.FawryPayoutGateway = FawryPayoutGateway = FawryPayoutGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FawryPayoutGateway);
//# sourceMappingURL=fawry-payout.gateway.js.map