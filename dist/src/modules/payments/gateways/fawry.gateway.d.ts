import { ConfigService } from '@nestjs/config';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
export declare class FawryGateway extends BasePaymentGateway {
    private readonly configService;
    private readonly httpClient;
    private readonly merchantCode;
    private readonly securityKey;
    private readonly baseUrl;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    private ensureConfigured;
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    refund(transactionId: string, amount: number): Promise<RefundResponse>;
    private generateSignature;
    private generateCallbackSignature;
    private generateRefundSignature;
    private mapFawryStatus;
    private mapRefundStatus;
}
