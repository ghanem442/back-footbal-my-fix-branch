import { WalletTransactionType } from '@prisma/client';
export declare class GetTransactionsQueryDto {
    page?: number;
    limit?: number;
    type?: WalletTransactionType;
    startDate?: string;
    endDate?: string;
}
