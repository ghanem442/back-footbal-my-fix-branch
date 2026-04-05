"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PayoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutService = void 0;
const common_1 = require("@nestjs/common");
let PayoutService = PayoutService_1 = class PayoutService {
    constructor() {
        this.gateways = new Map();
        this.logger = new common_1.Logger(PayoutService_1.name);
    }
    registerGateway(name, gateway) {
        this.gateways.set(name.toLowerCase(), gateway);
        this.logger.log(`Payout gateway '${name}' registered successfully`);
    }
    getGateway(name) {
        const gateway = this.gateways.get(name.toLowerCase());
        if (!gateway) {
            throw new common_1.NotFoundException(`Payout gateway '${name}' is not registered`);
        }
        return gateway;
    }
    getAvailableGateways() {
        return Array.from(this.gateways.keys());
    }
    async processPayout(gatewayName, request) {
        this.validatePayoutRequest(request);
        this.logger.log(`Processing payout via ${gatewayName} for user ${request.userId}, amount: ${request.amount}`);
        const gateway = this.getGateway(gatewayName);
        const response = await gateway.processPayout(request);
        this.logger.log(`Payout processed: ${response.payoutId}, status: ${response.status}`);
        return response;
    }
    async getPayoutStatus(gatewayName, payoutId) {
        const gateway = this.getGateway(gatewayName);
        return await gateway.getPayoutStatus(payoutId);
    }
    async cancelPayout(gatewayName, payoutId) {
        const gateway = this.getGateway(gatewayName);
        if (!gateway.cancelPayout) {
            throw new common_1.BadRequestException(`Gateway '${gatewayName}' does not support payout cancellation`);
        }
        return await gateway.cancelPayout(payoutId);
    }
    validatePayoutRequest(request) {
        if (!request.userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        if (!request.amount || request.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        if (!request.currency) {
            throw new common_1.BadRequestException('Currency is required');
        }
        if (!request.paymentMethod) {
            throw new common_1.BadRequestException('Payment method is required');
        }
        if (!request.recipientDetails) {
            throw new common_1.BadRequestException('Recipient details are required');
        }
        const details = request.recipientDetails;
        if (request.paymentMethod.toString().includes('BANK')) {
            if (!details.bankAccountNumber && !details.iban) {
                throw new common_1.BadRequestException('Bank account number or IBAN is required for bank transfers');
            }
            if (!details.accountHolderName) {
                throw new common_1.BadRequestException('Account holder name is required for bank transfers');
            }
        }
        if (request.paymentMethod.toString().includes('MOBILE') || request.paymentMethod.toString().includes('WALLET')) {
            if (!details.phoneNumber) {
                throw new common_1.BadRequestException('Phone number is required for mobile wallet payouts');
            }
        }
    }
};
exports.PayoutService = PayoutService;
exports.PayoutService = PayoutService = PayoutService_1 = __decorate([
    (0, common_1.Injectable)()
], PayoutService);
//# sourceMappingURL=payout.service.js.map