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
exports.MultiGatewayPaymentExample = exports.RefundProcessorExample = exports.WebhookHandlerExample = exports.BookingPaymentExample = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("../services/payment.service");
let BookingPaymentExample = class BookingPaymentExample {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async processBookingPayment(bookingId, amount, userId, gatewayName) {
        const paymentRequest = {
            bookingId,
            amount,
            currency: 'EGP',
            userId,
            metadata: {
                bookingType: 'field_reservation',
                timestamp: new Date().toISOString(),
            },
        };
        try {
            const response = await this.paymentService.initiatePayment(gatewayName, paymentRequest);
            if (response.status === 'SUCCESS') {
                return {
                    success: true,
                    transactionId: response.transactionId,
                    message: 'Payment successful',
                };
            }
            else if (response.status === 'PENDING') {
                return {
                    success: false,
                    pending: true,
                    redirectUrl: response.redirectUrl,
                    message: 'Payment pending - redirect required',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Payment failed',
                };
            }
        }
        catch (error) {
            throw error;
        }
    }
    getAvailablePaymentMethods() {
        return this.paymentService.getAvailableGateways();
    }
};
exports.BookingPaymentExample = BookingPaymentExample;
exports.BookingPaymentExample = BookingPaymentExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], BookingPaymentExample);
let WebhookHandlerExample = class WebhookHandlerExample {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async handleStripeWebhook(payload) {
        const result = await this.paymentService.handleWebhook('stripe', payload);
        if (result.status === 'SUCCESS') {
            await this.confirmBooking(result.bookingId, result.transactionId);
        }
        else {
            await this.failBooking(result.bookingId);
        }
        return result;
    }
    async handleFawryCallback(payload) {
        const result = await this.paymentService.handleWebhook('fawry', payload);
        return this.processWebhookResult(result);
    }
    async confirmBooking(bookingId, transactionId) {
        console.log(`Confirming booking ${bookingId} with transaction ${transactionId}`);
    }
    async failBooking(bookingId) {
        console.log(`Failing booking ${bookingId}`);
    }
    async processWebhookResult(result) {
        return result;
    }
};
exports.WebhookHandlerExample = WebhookHandlerExample;
exports.WebhookHandlerExample = WebhookHandlerExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], WebhookHandlerExample);
let RefundProcessorExample = class RefundProcessorExample {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async processFullRefund(bookingId, transactionId, amount, gatewayName) {
        try {
            const refundResponse = await this.paymentService.processRefund(gatewayName, transactionId, amount);
            if (refundResponse.status === 'SUCCESS') {
                await this.creditUserWallet(bookingId, amount);
                return {
                    success: true,
                    refundId: refundResponse.refundId,
                    message: 'Refund processed successfully',
                };
            }
            else if (refundResponse.status === 'PENDING') {
                return {
                    success: false,
                    pending: true,
                    message: 'Refund is being processed',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Refund failed',
                };
            }
        }
        catch (error) {
            throw error;
        }
    }
    async processPartialRefund(bookingId, transactionId, originalAmount, refundPercentage, gatewayName) {
        const refundAmount = originalAmount * (refundPercentage / 100);
        return this.processFullRefund(bookingId, transactionId, refundAmount, gatewayName);
    }
    async creditUserWallet(bookingId, amount) {
        console.log(`Crediting wallet for booking ${bookingId} with ${amount}`);
    }
};
exports.RefundProcessorExample = RefundProcessorExample;
exports.RefundProcessorExample = RefundProcessorExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], RefundProcessorExample);
let MultiGatewayPaymentExample = class MultiGatewayPaymentExample {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async processPaymentWithFallback(paymentRequest, primaryGateway, fallbackGateway) {
        try {
            const response = await this.paymentService.initiatePayment(primaryGateway, paymentRequest);
            return { gateway: primaryGateway, response };
        }
        catch (error) {
            console.log(`Primary gateway ${primaryGateway} failed, trying fallback`);
            const response = await this.paymentService.initiatePayment(fallbackGateway, paymentRequest);
            return { gateway: fallbackGateway, response };
        }
    }
    getRecommendedGateway(userCountry, userPreference) {
        const availableGateways = this.paymentService.getAvailableGateways();
        if (userPreference && availableGateways.includes(userPreference)) {
            return userPreference;
        }
        if (userCountry === 'EG') {
            if (availableGateways.includes('fawry'))
                return 'fawry';
            if (availableGateways.includes('vodafone_cash'))
                return 'vodafone_cash';
            if (availableGateways.includes('instapay'))
                return 'instapay';
        }
        return 'stripe';
    }
};
exports.MultiGatewayPaymentExample = MultiGatewayPaymentExample;
exports.MultiGatewayPaymentExample = MultiGatewayPaymentExample = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], MultiGatewayPaymentExample);
//# sourceMappingURL=usage-example.js.map