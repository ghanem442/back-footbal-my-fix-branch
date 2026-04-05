import { WalletService } from './wallet.service';
import { GetTransactionsQueryDto, WithdrawDto, ProcessWithdrawalDto } from './dto';
import { Request } from 'express';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getWallet(req: Request & {
        user: JwtPayload;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            balance: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getTransactions(req: Request & {
        user: JwtPayload;
    }, query: GetTransactionsQueryDto): Promise<{
        success: boolean;
        data: {
            transactions: {
                id: string;
                type: import(".prisma/client").$Enums.WalletTransactionType;
                amount: string;
                balanceBefore: string;
                balanceAfter: string;
                reference: string | null;
                description: string | null;
                createdAt: Date;
            }[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        };
    }>;
    withdraw(req: Request & {
        user: JwtPayload;
    }, withdrawDto: WithdrawDto): Promise<{
        success: boolean;
        data: {
            transactionId: string;
            amount: string;
            balanceBefore: string;
            balanceAfter: string;
            description: string | null;
            createdAt: Date;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    requestWithdrawal(req: Request & {
        user: JwtPayload;
    }, body: {
        amount: number;
        paymentMethod: string;
        accountDetails: string;
    }): Promise<{
        success: boolean;
        data: any;
        message: {
            en: string;
            ar: string;
        };
    }>;
    getWithdrawalRequests(req: Request & {
        user: JwtPayload;
    }, page?: string, limit?: string): Promise<{
        success: boolean;
        data: any;
        message: {
            en: string;
            ar: string;
        };
    }>;
    processWithdrawal(req: Request & {
        user: JwtPayload;
    }, dto: ProcessWithdrawalDto): Promise<{
        success: boolean;
        data: {
            transactionId: string;
            payoutId: string;
            amount: string;
            balanceBefore: string;
            balanceAfter: string;
            status: string;
            estimatedArrival: Date | undefined;
            gateway: import("./dto").WithdrawalGateway;
            method: import("./dto").WithdrawalMethod;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getWithdrawalStatus(gateway: string, payoutId: string): Promise<{
        success: boolean;
        data: {
            payoutId: string;
            status: string;
            amount: string;
            currency: string;
            createdAt: Date;
            completedAt: Date | undefined;
            failureReason: string | undefined;
        };
    }>;
}
