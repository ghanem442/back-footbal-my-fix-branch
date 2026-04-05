export interface PaymentRequest {
    bookingId: string;
    amount: number;
    currency: string;
    userId: string;
    metadata?: Record<string, any>;
}
export interface PaymentResponse {
    transactionId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    gatewayResponse: any;
    redirectUrl?: string;
}
export interface WebhookResult {
    transactionId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    bookingId: string;
    metadata?: Record<string, any>;
}
export interface RefundResponse {
    refundId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    amount: number;
    gatewayResponse: any;
}
export interface PaymentGateway {
    processPayment(request: PaymentRequest): Promise<PaymentResponse>;
    handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
    refund(transactionId: string, amount: number): Promise<RefundResponse>;
}
