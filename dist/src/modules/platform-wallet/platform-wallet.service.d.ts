import { PrismaService } from '@modules/prisma/prisma.service';
export declare class PlatformWalletService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getWallet(): Promise<{
        id: any;
        balance: number;
        createdAt: any;
        updatedAt: any;
    }>;
    credit(amount: number, type: string, bookingId?: string, description?: string, reference?: string): Promise<{
        id: any;
        type: string;
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
    }>;
    debit(amount: number, type: string, bookingId?: string, description?: string, reference?: string, payoutMethod?: string, payoutDetails?: Record<string, any>): Promise<{
        id: any;
        type: string;
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
        reference: string | null;
        description: string | null;
        payoutMethod: string | null;
        payoutDetails: Record<string, any> | null;
        createdAt: Date;
    }>;
    getTransactions(page?: number, limit?: number, type?: string, bookingId?: string): Promise<{
        transactions: any[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
}
