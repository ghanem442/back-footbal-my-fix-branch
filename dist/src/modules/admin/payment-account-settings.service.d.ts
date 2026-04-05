import { PrismaService } from '@modules/prisma/prisma.service';
import { CreatePaymentAccountDto, UpdatePaymentAccountDto } from './dto/payment-account-settings.dto';
export declare class PaymentAccountSettingsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    upsertPaymentAccount(dto: CreatePaymentAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    createAccount(dto: CreatePaymentAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    updateAccount(id: string, dto: UpdatePaymentAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    getAllAccounts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }[]>;
    deleteAccount(id: string): Promise<{
        deleted: boolean;
    }>;
    upsertPaymentAccountOld(dto: CreatePaymentAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    updatePaymentAccount(paymentMethod: string, dto: UpdatePaymentAccountDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    getAllPaymentAccounts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }[]>;
    getPaymentAccount(paymentMethod: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    }>;
    getActivePaymentAccount(paymentMethod: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentMethod: string;
        accountNumber: string | null;
        accountName: string | null;
        mobileNumber: string | null;
        ipn: string | null;
        bankAccount: string | null;
        isActive: boolean;
    } | null>;
    deletePaymentAccount(paymentMethod: string): Promise<{
        deleted: boolean;
    }>;
}
