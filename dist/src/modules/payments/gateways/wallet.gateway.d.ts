import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
import { WalletService } from '@modules/wallet/wallet.service';
export declare class WalletGateway implements PaymentGateway {
    private readonly walletService;
    private readonly logger;
    constructor(walletService: WalletService);
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(_payload: any, _signature?: string): Promise<WebhookResult>;
    refund(transactionId: string, amount: number): Promise<RefundResponse>;
}
