export interface PayoutRequest {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: PayoutMethod;
    recipientDetails: RecipientDetails;
    metadata?: Record<string, any>;
}
export interface RecipientDetails {
    bankAccountNumber?: string;
    bankName?: string;
    bankCode?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
    phoneNumber?: string;
    walletProvider?: string;
    email?: string;
    name?: string;
}
export declare enum PayoutMethod {
    BANK_TRANSFER = "BANK_TRANSFER",
    MOBILE_WALLET = "MOBILE_WALLET",
    STRIPE_CONNECT = "STRIPE_CONNECT",
    FAWRY_PAYOUT = "FAWRY_PAYOUT",
    VODAFONE_CASH = "VODAFONE_CASH",
    INSTAPAY = "INSTAPAY"
}
export interface PayoutResponse {
    payoutId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
    gatewayResponse: any;
    estimatedArrival?: Date;
    fee?: number;
}
export interface PayoutStatusResponse {
    payoutId: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    createdAt: Date;
    completedAt?: Date;
    failureReason?: string;
}
export interface PayoutGateway {
    processPayout(request: PayoutRequest): Promise<PayoutResponse>;
    getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse>;
    cancelPayout?(payoutId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
