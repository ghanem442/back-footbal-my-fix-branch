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
var PaymobGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let PaymobGateway = PaymobGateway_1 = class PaymobGateway {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(PaymobGateway_1.name);
        this.baseUrl = 'https://accept.paymob.com/api';
        this.apiKey = this.config.get('PAYMOB_API_KEY', '');
        this.integrationId = this.config.get('PAYMOB_INTEGRATION_ID', '');
        this.iframeId = this.config.get('PAYMOB_IFRAME_ID', '');
        this.hmacSecret = this.config.get('PAYMOB_HMAC_SECRET', '');
        if (!this.apiKey) {
            this.logger.warn('Paymob credentials not configured.');
        }
    }
    async processPayment(request) {
        try {
            const authRes = await axios_1.default.post(`${this.baseUrl}/auth/tokens`, {
                api_key: this.apiKey,
            });
            const authToken = authRes.data.token;
            const orderRes = await axios_1.default.post(`${this.baseUrl}/ecommerce/orders`, {
                auth_token: authToken,
                delivery_needed: false,
                amount_cents: Math.round(request.amount * 100),
                currency: request.currency || 'EGP',
                merchant_order_id: request.bookingId,
                items: [],
            });
            const orderId = String(orderRes.data.id);
            const paymentKeyRes = await axios_1.default.post(`${this.baseUrl}/acceptance/payment_keys`, {
                auth_token: authToken,
                amount_cents: Math.round(request.amount * 100),
                expiration: 3600,
                order_id: orderId,
                billing_data: {
                    apartment: 'NA',
                    email: request.metadata?.playerEmail || 'player@fieldbook.com',
                    floor: 'NA',
                    first_name: 'Player',
                    street: 'NA',
                    building: 'NA',
                    phone_number: request.metadata?.phoneNumber || '+201000000000',
                    shipping_method: 'NA',
                    postal_code: 'NA',
                    city: 'Cairo',
                    country: 'EG',
                    last_name: 'User',
                    state: 'Cairo',
                },
                currency: request.currency || 'EGP',
                integration_id: parseInt(this.integrationId, 10),
                lock_order_when_paid: true,
            });
            const paymentToken = paymentKeyRes.data.token;
            const ngrokUrl = this.config.get('NGROK_URL', '');
            const baseUrl = ngrokUrl || `http://localhost:3000`;
            const redirectUrl = `${baseUrl}/api/v1/payments/callback/paymob`;
            const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.iframeId}?payment_token=${paymentToken}`;
            this.logger.log(`Paymob payment initiated for booking ${request.bookingId}, order ${orderId}`);
            return {
                transactionId: orderId,
                status: 'PENDING',
                gatewayResponse: { orderId, paymentToken, iframeId: this.iframeId },
                redirectUrl: iframeUrl,
            };
        }
        catch (error) {
            const errMsg = error?.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`Paymob payment failed: ${errMsg}`);
            console.error('=== PAYMOB ERROR DETAILS ===');
            console.error('Message:', error.message);
            console.error('Response data:', JSON.stringify(error?.response?.data, null, 2));
            console.error('Status:', error?.response?.status);
            console.error('============================');
            return {
                transactionId: '',
                status: 'FAILED',
                gatewayResponse: { error: errMsg },
            };
        }
    }
    async handleWebhook(payload, signature) {
        if (this.hmacSecret && signature) {
            const computed = this.computeHmac(payload);
            if (computed !== signature) {
                throw new Error('Paymob webhook HMAC verification failed');
            }
        }
        const obj = payload?.obj ?? payload;
        const transactionId = String(obj?.id ?? obj?.order?.id ?? '');
        const bookingId = obj?.order?.merchant_order_id ?? obj?.merchant_order_id ?? '';
        const success = obj?.success === true || obj?.success === 'true';
        const pending = obj?.pending === true || obj?.pending === 'true';
        const status = success ? 'SUCCESS' : pending ? 'PENDING' : 'FAILED';
        return {
            transactionId,
            status,
            bookingId,
            metadata: {
                paymobTransactionId: obj?.id,
                orderId: obj?.order?.id,
                amountCents: obj?.amount_cents,
                currency: obj?.currency,
                providerReference: obj?.source_data?.pan ?? obj?.id,
            },
        };
    }
    async refund(_transactionId, _amount) {
        return { refundId: '', status: 'PENDING', amount: _amount, gatewayResponse: { note: 'Manual refund required' } };
    }
    computeHmac(payload) {
        const obj = payload?.obj ?? payload;
        const fields = [
            obj?.amount_cents, obj?.created_at, obj?.currency, obj?.error_occured,
            obj?.has_parent_transaction, obj?.id, obj?.integration_id, obj?.is_3d_secure,
            obj?.is_auth, obj?.is_capture, obj?.is_refunded, obj?.is_standalone_payment,
            obj?.is_voided, obj?.order?.id, obj?.owner, obj?.pending,
            obj?.source_data?.pan, obj?.source_data?.sub_type, obj?.source_data?.type,
            obj?.success,
        ];
        const str = fields.map(f => (f === undefined || f === null ? '' : String(f))).join('');
        return crypto.createHmac('sha512', this.hmacSecret).update(str).digest('hex');
    }
};
exports.PaymobGateway = PaymobGateway;
exports.PaymobGateway = PaymobGateway = PaymobGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaymobGateway);
//# sourceMappingURL=paymob.gateway.js.map