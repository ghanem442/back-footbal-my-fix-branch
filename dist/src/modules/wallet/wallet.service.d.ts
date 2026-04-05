import { PrismaService } from '@modules/prisma/prisma.service';
import { Wallet, WalletTransaction, WalletTransactionType } from '@prisma/client';
import { PayoutService } from '@modules/payments/services/payout.service';
import { PayoutMethod, RecipientDetails } from '@modules/payments/interfaces/payout-gateway.interface';
export declare class WalletService {
    private prisma;
    private payoutService;
    private readonly logger;
    constructor(prisma: PrismaService, payoutService: PayoutService);
    getWalletByUserId(userId: string): Promise<Wallet>;
    credit(userId: string, amount: number, type: WalletTransactionType, description: string, reference?: string, metadata?: Record<string, any>): Promise<WalletTransaction>;
    debit(userId: string, amount: number, type: WalletTransactionType, description: string, reference?: string, metadata?: Record<string, any>): Promise<WalletTransaction>;
    getTransactions(userId: string, options?: {
        page?: number;
        limit?: number;
        type?: WalletTransactionType;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        transactions: WalletTransaction[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    hasSufficientBalance(userId: string, amount: number): Promise<boolean>;
    withdraw(userId: string, amount: number, paymentMethod?: string, accountDetails?: string): Promise<WalletTransaction>;
    processWithdrawal(userId: string, amount: number, gateway: string, method: PayoutMethod, recipientDetails: RecipientDetails, metadata?: Record<string, any>): Promise<{
        transaction: WalletTransaction;
        payoutId: string;
        status: string;
        estimatedArrival?: Date;
    }>;
    getWithdrawalStatus(gateway: string, payoutId: string): Promise<{
        payoutId: string;
        status: string;
        amount: number;
        currency: string;
        createdAt: Date;
        completedAt?: Date;
        failureReason?: string;
    }>;
    creditFieldOwner(fieldOwnerId: string, bookingId: string, totalAmount: number, commissionAmount: number): Promise<WalletTransaction>;
    createWithdrawalRequest(ownerId: string, amount: number, paymentMethod: string, accountDetails: string): Promise<any>;
    approveWithdrawalRequest(requestId: string, adminId: string, transactionRef?: string): Promise<any>;
    rejectWithdrawalRequest(requestId: string, adminId: string, adminNote: string): Promise<any>;
    private formatWithdrawalRequest;
    getWithdrawalRequests(ownerId: string, page?: number, limit?: number): Promise<any>;
}
