export declare enum WithdrawalMethod {
    BANK_TRANSFER = "BANK_TRANSFER",
    MOBILE_WALLET = "MOBILE_WALLET",
    STRIPE_CONNECT = "STRIPE_CONNECT",
    FAWRY_PAYOUT = "FAWRY_PAYOUT",
    VODAFONE_CASH = "VODAFONE_CASH",
    INSTAPAY = "INSTAPAY"
}
export declare enum WithdrawalGateway {
    STRIPE = "stripe",
    FAWRY = "fawry",
    VODAFONE = "vodafone",
    INSTAPAY = "instapay"
}
export declare class BankAccountDetailsDto {
    bankAccountNumber?: string;
    bankName?: string;
    bankCode?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
}
export declare class MobileWalletDetailsDto {
    phoneNumber: string;
    walletProvider?: string;
    name?: string;
}
export declare class ProcessWithdrawalDto {
    amount: number;
    method: WithdrawalMethod;
    gateway: WithdrawalGateway;
    bankDetails?: BankAccountDetailsDto;
    mobileWalletDetails?: MobileWalletDetailsDto;
    stripeConnectedAccountId?: string;
}
