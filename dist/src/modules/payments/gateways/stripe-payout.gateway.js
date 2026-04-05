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
var StripePayoutGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripePayoutGateway = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const common_2 = require("@nestjs/common");
const payout_gateway_interface_1 = require("../interfaces/payout-gateway.interface");
let StripePayoutGateway = StripePayoutGateway_1 = class StripePayoutGateway {
    constructor(configService) {
        this.configService = configService;
        this.stripe = null;
        this.isConfigured = false;
        this.logger = new common_2.Logger(StripePayoutGateway_1.name);
        const apiKey = this.configService.get('STRIPE_SECRET_KEY');
        if (apiKey && apiKey !== 'your-stripe-secret-key') {
            this.stripe = new stripe_1.default(apiKey, {
                apiVersion: '2026-01-28.clover',
            });
            this.isConfigured = true;
            this.logger.log('Stripe payout gateway initialized successfully');
        }
        else {
            this.logger.warn('Stripe credentials not configured. Stripe payouts will not be available.');
        }
    }
    ensureConfigured() {
        if (!this.isConfigured || !this.stripe) {
            throw new common_1.BadRequestException('Stripe payout gateway is not configured');
        }
    }
    async processPayout(request) {
        this.ensureConfigured();
        this.logger.log(`Processing payout for user ${request.userId}, amount: ${request.amount}`);
        try {
            if (request.paymentMethod === payout_gateway_interface_1.PayoutMethod.STRIPE_CONNECT) {
                return await this.processConnectPayout(request);
            }
            else if (request.paymentMethod === payout_gateway_interface_1.PayoutMethod.BANK_TRANSFER) {
                return await this.processBankPayout(request);
            }
            else {
                throw new common_1.BadRequestException('Unsupported payout method for Stripe');
            }
        }
        catch (error) {
            this.logger.error(`Payout failed: ${error.message}`, error.stack);
            throw new common_1.InternalServerErrorException(`Stripe payout failed: ${error.message}`);
        }
    }
    async processConnectPayout(request) {
        const connectedAccountId = request.metadata?.stripeConnectedAccountId;
        if (!connectedAccountId) {
            throw new common_1.BadRequestException('Stripe connected account ID is required');
        }
        const transfer = await this.stripe.transfers.create({
            amount: Math.round(request.amount * 100),
            currency: request.currency.toLowerCase(),
            destination: connectedAccountId,
            metadata: {
                userId: request.userId,
                ...request.metadata,
            },
        });
        return {
            payoutId: transfer.id,
            status: this.mapTransferStatus(transfer),
            gatewayResponse: transfer,
            estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            fee: 0,
        };
    }
    async processBankPayout(request) {
        const payout = await this.stripe.payouts.create({
            amount: Math.round(request.amount * 100),
            currency: request.currency.toLowerCase(),
            metadata: {
                userId: request.userId,
                recipientName: request.recipientDetails.accountHolderName || '',
                ...request.metadata,
            },
        });
        return {
            payoutId: payout.id,
            status: this.mapPayoutStatus(payout.status),
            gatewayResponse: payout,
            estimatedArrival: new Date(payout.arrival_date * 1000),
            fee: payout.amount / 100,
        };
    }
    async getPayoutStatus(payoutId) {
        this.ensureConfigured();
        try {
            try {
                const payout = await this.stripe.payouts.retrieve(payoutId);
                return {
                    payoutId: payout.id,
                    status: this.mapPayoutStatus(payout.status),
                    amount: payout.amount / 100,
                    currency: payout.currency.toUpperCase(),
                    createdAt: new Date(payout.created * 1000),
                    completedAt: payout.arrival_date ? new Date(payout.arrival_date * 1000) : undefined,
                    failureReason: payout.failure_message || undefined,
                };
            }
            catch {
                const transfer = await this.stripe.transfers.retrieve(payoutId);
                return {
                    payoutId: transfer.id,
                    status: this.mapTransferStatus(transfer),
                    amount: transfer.amount / 100,
                    currency: transfer.currency.toUpperCase(),
                    createdAt: new Date(transfer.created * 1000),
                    completedAt: transfer.created ? new Date(transfer.created * 1000) : undefined,
                };
            }
        }
        catch (error) {
            this.logger.error(`Failed to get payout status: ${error.message}`);
            throw new common_1.InternalServerErrorException(`Failed to get payout status: ${error.message}`);
        }
    }
    async cancelPayout(payoutId) {
        this.ensureConfigured();
        try {
            const payout = await this.stripe.payouts.cancel(payoutId);
            return {
                success: payout.status === 'canceled',
                message: payout.status === 'canceled' ? 'Payout cancelled successfully' : 'Failed to cancel payout',
            };
        }
        catch (error) {
            this.logger.error(`Failed to cancel payout: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }
    mapPayoutStatus(status) {
        switch (status) {
            case 'paid':
                return 'SUCCESS';
            case 'pending':
            case 'in_transit':
                return 'PENDING';
            case 'failed':
                return 'FAILED';
            case 'canceled':
                return 'CANCELLED';
            default:
                return 'PENDING';
        }
    }
    mapTransferStatus(transfer) {
        if (transfer.reversed)
            return 'FAILED';
        return 'SUCCESS';
    }
};
exports.StripePayoutGateway = StripePayoutGateway;
exports.StripePayoutGateway = StripePayoutGateway = StripePayoutGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripePayoutGateway);
//# sourceMappingURL=stripe-payout.gateway.js.map