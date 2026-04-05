export declare class InitiatePaymentDto {
    bookingId: string;
    gateway: 'stripe' | 'fawry' | 'vodafone_cash' | 'instapay' | 'wallet';
    metadata?: Record<string, any>;
}
