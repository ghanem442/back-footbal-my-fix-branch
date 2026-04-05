import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
export declare class PaymobGateway implements PaymentGateway {
    private readonly config;
    private readonly logger;
    private readonly apiKey;
    private readonly integrationId;
    private readonly iframeId;
    private readonly hmacSecret;
    private readonly baseUrl;
    constructor(config: ConfigService);
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    refund(_transactionId: string, _amount: number): Promise<RefundResponse>;
    private computeHmac;
}
