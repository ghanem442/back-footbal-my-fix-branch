export declare class PaymentResponseDto {
    transactionId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    gatewayResponse: any;
    redirectUrl?: string;
}
export declare class RefundResponseDto {
    refundId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    amount: number;
    gatewayResponse: any;
}
