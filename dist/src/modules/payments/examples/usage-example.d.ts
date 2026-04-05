import { PaymentService } from '../services/payment.service';
import { PaymentRequest } from '../interfaces/payment-gateway.interface';
export declare class BookingPaymentExample {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    processBookingPayment(bookingId: string, amount: number, userId: string, gatewayName: string): Promise<{
        success: boolean;
        transactionId: string;
        message: string;
        pending?: undefined;
        redirectUrl?: undefined;
    } | {
        success: boolean;
        pending: boolean;
        redirectUrl: string | undefined;
        message: string;
        transactionId?: undefined;
    } | {
        success: boolean;
        message: string;
        transactionId?: undefined;
        pending?: undefined;
        redirectUrl?: undefined;
    }>;
    getAvailablePaymentMethods(): string[];
}
export declare class WebhookHandlerExample {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    handleStripeWebhook(payload: any): Promise<import("../interfaces/payment-gateway.interface").WebhookResult>;
    handleFawryCallback(payload: any): Promise<any>;
    private confirmBooking;
    private failBooking;
    private processWebhookResult;
}
export declare class RefundProcessorExample {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    processFullRefund(bookingId: string, transactionId: string, amount: number, gatewayName: string): Promise<{
        success: boolean;
        refundId: string;
        message: string;
        pending?: undefined;
    } | {
        success: boolean;
        pending: boolean;
        message: string;
        refundId?: undefined;
    } | {
        success: boolean;
        message: string;
        refundId?: undefined;
        pending?: undefined;
    }>;
    processPartialRefund(bookingId: string, transactionId: string, originalAmount: number, refundPercentage: number, gatewayName: string): Promise<{
        success: boolean;
        refundId: string;
        message: string;
        pending?: undefined;
    } | {
        success: boolean;
        pending: boolean;
        message: string;
        refundId?: undefined;
    } | {
        success: boolean;
        message: string;
        refundId?: undefined;
        pending?: undefined;
    }>;
    private creditUserWallet;
}
export declare class MultiGatewayPaymentExample {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    processPaymentWithFallback(paymentRequest: PaymentRequest, primaryGateway: string, fallbackGateway: string): Promise<{
        gateway: string;
        response: import("../interfaces/payment-gateway.interface").PaymentResponse;
    }>;
    getRecommendedGateway(userCountry: string, userPreference?: string): string;
}
