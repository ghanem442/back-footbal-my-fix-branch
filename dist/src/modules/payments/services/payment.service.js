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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../../logger/logger.service");
let PaymentService = class PaymentService {
    constructor(loggerService) {
        this.loggerService = loggerService;
        this.gateways = new Map();
    }
    registerGateway(name, gateway) {
        this.gateways.set(name.toLowerCase(), gateway);
    }
    getGateway(name) {
        const gateway = this.gateways.get(name.toLowerCase());
        if (!gateway) {
            throw new common_1.NotFoundException(`Payment gateway '${name}' is not registered`);
        }
        return gateway;
    }
    getAvailableGateways() {
        return Array.from(this.gateways.keys());
    }
    async initiatePayment(gatewayName, request) {
        this.validatePaymentRequest(request);
        this.loggerService.logPaymentTransaction({
            bookingId: request.bookingId,
            gateway: gatewayName,
            amount: request.amount,
            currency: request.currency,
            status: 'initiated',
            userId: request.userId,
        });
        const gateway = this.getGateway(gatewayName);
        const response = await gateway.processPayment(request);
        this.loggerService.logPaymentTransaction({
            bookingId: request.bookingId,
            gateway: gatewayName,
            amount: request.amount,
            currency: request.currency,
            status: response.status.toLowerCase(),
            transactionId: response.transactionId,
            userId: request.userId,
        });
        return response;
    }
    async handleWebhook(gatewayName, payload, signature, rawBody) {
        this.verifyWebhookSignature(gatewayName, payload, signature, rawBody);
        this.loggerService.logWebhook({
            gateway: gatewayName,
            event: payload.type || payload.event || 'unknown',
            status: 'received',
            payload: payload,
        });
        const gateway = this.getGateway(gatewayName);
        const result = await gateway.handleWebhook(payload, signature);
        if (result.bookingId && result.status) {
            this.loggerService.logPaymentStatusChange({
                bookingId: result.bookingId,
                gateway: gatewayName,
                oldStatus: 'pending',
                newStatus: result.status,
                transactionId: result.transactionId,
            });
        }
        return result;
    }
    verifyWebhookSignature(gateway, payload, signature, rawBody) {
        switch (gateway.toLowerCase()) {
            case 'stripe':
                break;
            case 'fawry':
            case 'vodafone_cash':
            case 'instapay':
                break;
            default:
                this.loggerService.warn(`Webhook signature verification not implemented for gateway: ${gateway}`);
        }
    }
    async processRefund(gatewayName, transactionId, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Refund amount must be greater than zero');
        }
        const gateway = this.getGateway(gatewayName);
        return gateway.refund(transactionId, amount);
    }
    validatePaymentRequest(request) {
        if (!request.bookingId) {
            throw new common_1.BadRequestException('Booking ID is required');
        }
        if (!request.amount || request.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        if (!request.currency) {
            throw new common_1.BadRequestException('Currency is required');
        }
        if (!request.userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map