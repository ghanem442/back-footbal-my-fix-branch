import { ConfigService } from '@nestjs/config';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
export declare class InstaPayGateway extends BasePaymentGateway {
    private readonly configService;
    private readonly httpClient;
    private readonly merchantId;
    private readonly apiKey;
    private readonly secretKey;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    refund(transactionId: string, amount: number): Promise<RefundResponse>;
    private generateSignature;
    private generateCallbackSignature;
    private generateRefundSignature;
    private mapInstaPayStatus;
    private mapRefundStatus;
}
