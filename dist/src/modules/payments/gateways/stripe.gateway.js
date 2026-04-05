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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const base_payment_gateway_1 = require("./base-payment-gateway");
let StripeGateway = class StripeGateway extends base_payment_gateway_1.BasePaymentGateway {
    constructor(configService) {
        super('Stripe');
        this.configService = configService;
        this.stripe = null;
        this.isConfigured = false;
        const apiKey = this.configService.get('STRIPE_SECRET_KEY');
        this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET') || '';
        if (apiKey && apiKey !== 'your-stripe-secret-key') {
            this.stripe = new stripe_1.default(apiKey, {
                apiVersion: '2026-01-28.clover',
            });
            this.isConfigured = true;
            this.logger.log('Stripe gateway initialized successfully');
        }
        else {
            this.logger.warn('Stripe credentials not configured. Stripe payments will not be available.');
        }
    }
    ensureConfigured() {
        if (!this.isConfigured || !this.stripe) {
            throw new common_1.BadRequestException('Stripe payment gateway is not configured. Please configure STRIPE_SECRET_KEY in environment variables.');
        }
    }
    async processPayment(request) {
        this.ensureConfigured();
        this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(request.amount * 100),
                currency: request.currency.toLowerCase(),
                metadata: {
                    bookingId: request.bookingId,
                    userId: request.userId,
                    ...request.metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            return {
                transactionId: paymentIntent.id,
                status: this.mapStripeStatus(paymentIntent.status),
                gatewayResponse: paymentIntent,
                redirectUrl: paymentIntent.next_action?.redirect_to_url?.url || undefined,
            };
        }
        catch (error) {
            this.logPaymentError('processPayment', error);
            throw new common_1.InternalServerErrorException(`Stripe payment failed: ${error.message}`);
        }
    }
    async handleWebhook(payload, signature) {
        this.ensureConfigured();
        try {
            let event;
            if (this.webhookSecret && signature) {
                try {
                    event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
                }
                catch (error) {
                    this.logPaymentError('handleWebhook - signature verification', error);
                    throw new common_1.BadRequestException(`Webhook signature verification failed: ${error.message}`);
                }
            }
            else {
                event = typeof payload === 'string' ? JSON.parse(payload) : payload;
            }
            this.logPaymentOperation('handleWebhook', { eventType: event.type, eventId: event.id });
            switch (event.type) {
                case 'payment_intent.succeeded':
                    return this.handlePaymentIntentSucceeded(event.data.object);
                case 'payment_intent.payment_failed':
                    return this.handlePaymentIntentFailed(event.data.object);
                case 'charge.refunded':
                    return this.handleChargeRefunded(event.data.object);
                default:
                    this.logger.warn(`Unhandled Stripe event type: ${event.type}`);
                    throw new common_1.BadRequestException(`Unhandled event type: ${event.type}`);
            }
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
            const refund = await this.stripe.refunds.create({
                payment_intent: transactionId,
                amount: Math.round(amount * 100),
            });
            return {
                refundId: refund.id,
                status: this.mapRefundStatus(refund.status || 'pending'),
                amount: refund.amount / 100,
                gatewayResponse: refund,
            };
        }
        catch (error) {
            this.logPaymentError('refund', error);
            throw new common_1.InternalServerErrorException(`Stripe refund failed: ${error.message}`);
        }
    }
    handlePaymentIntentSucceeded(paymentIntent) {
        return {
            transactionId: paymentIntent.id,
            status: 'SUCCESS',
            bookingId: paymentIntent.metadata.bookingId,
            metadata: {
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                paymentMethod: paymentIntent.payment_method,
            },
        };
    }
    handlePaymentIntentFailed(paymentIntent) {
        return {
            transactionId: paymentIntent.id,
            status: 'FAILED',
            bookingId: paymentIntent.metadata.bookingId,
            metadata: {
                error: paymentIntent.last_payment_error?.message,
                failureCode: paymentIntent.last_payment_error?.code,
            },
        };
    }
    handleChargeRefunded(charge) {
        return {
            transactionId: charge.payment_intent,
            status: 'SUCCESS',
            bookingId: charge.metadata.bookingId,
            metadata: {
                refunded: true,
                amountRefunded: charge.amount_refunded / 100,
            },
        };
    }
    mapStripeStatus(status) {
        switch (status) {
            case 'succeeded':
                return 'SUCCESS';
            case 'processing':
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
                return 'PENDING';
            case 'canceled':
            case 'requires_capture':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
    mapRefundStatus(status) {
        switch (status) {
            case 'succeeded':
                return 'SUCCESS';
            case 'pending':
                return 'PENDING';
            case 'failed':
            case 'canceled':
                return 'FAILED';
            default:
                return 'PENDING';
        }
    }
};
exports.StripeGateway = StripeGateway;
exports.StripeGateway = StripeGateway = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeGateway);
//# sourceMappingURL=stripe.gateway.js.map