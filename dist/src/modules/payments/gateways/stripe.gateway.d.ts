import { ConfigService } from '@nestjs/config';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
export declare class StripeGateway extends BasePaymentGateway {
    private readonly configService;
    private readonly stripe;
    private readonly webhookSecret;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    private ensureConfigured;
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    refund(transactionId: string, amount: number): Promise<RefundResponse>;
    private handlePaymentIntentSucceeded;
    private handlePaymentIntentFailed;
    private handleChargeRefunded;
    private mapStripeStatus;
    private mapRefundStatus;
}
