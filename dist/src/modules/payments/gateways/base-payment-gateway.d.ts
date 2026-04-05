import { Logger } from '@nestjs/common';
import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
export declare abstract class BasePaymentGateway implements PaymentGateway {
    protected readonly gatewayName: string;
    protected readonly logger: Logger;
    constructor(gatewayName: string);
    abstract processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    abstract handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    abstract refund(transactionId: string, amount: number): Promise<RefundResponse>;
    protected logPaymentOperation(operation: string, details: any): void;
    protected logPaymentError(operation: string, error: any): void;
}
