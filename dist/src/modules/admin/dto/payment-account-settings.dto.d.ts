export declare class CreatePaymentAccountDto {
    paymentMethod: string;
    accountNumber?: string;
    accountName?: string;
    mobileNumber?: string;
    ipn?: string;
    bankAccount?: string;
    isActive?: boolean;
}
export declare class UpdatePaymentAccountDto {
    accountNumber?: string;
    accountName?: string;
    mobileNumber?: string;
    ipn?: string;
    bankAccount?: string;
    isActive?: boolean;
}
