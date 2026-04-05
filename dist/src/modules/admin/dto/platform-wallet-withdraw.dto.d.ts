export declare enum PayoutMethod {
    MOBILE_WALLET = "MOBILE_WALLET",
    INSTAPAY = "INSTAPAY"
}
export declare enum WalletProvider {
    VODAFONE = "VODAFONE",
    ORANGE = "ORANGE",
    ETISALAT = "ETISALAT",
    WE = "WE"
}
export declare class PlatformWalletWithdrawDto {
    amount: number;
    description?: string;
    reference?: string;
    payoutMethod: PayoutMethod;
    phoneNumber?: string;
    walletProvider?: WalletProvider;
    accountDetails?: string;
    accountHolderName: string;
}
