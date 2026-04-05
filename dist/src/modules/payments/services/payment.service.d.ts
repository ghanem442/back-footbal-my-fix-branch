import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
import { LoggerService } from '@modules/logger/logger.service';
export declare class PaymentService {
    private readonly loggerService;
    private readonly gateways;
    constructor(loggerService: LoggerService);
    registerGateway(name: string, gateway: PaymentGateway): void;
    getGateway(name: string): PaymentGateway;
    getAvailableGateways(): string[];
    initiatePayment(gatewayName: string, request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(gatewayName: string, payload: any, signature?: string, rawBody?: string | Buffer): Promise<WebhookResult>;
    private verifyWebhookSignature;
    processRefund(gatewayName: string, transactionId: string, amount: number): Promise<RefundResponse>;
    private validatePaymentRequest;
}
