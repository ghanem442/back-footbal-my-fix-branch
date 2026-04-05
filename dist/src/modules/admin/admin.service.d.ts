import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PlatformWalletService } from '@modules/platform-wallet/platform-wallet.service';
export declare class AdminService {
    private readonly prisma;
    private readonly platformWalletService;
    private readonly logger;
    private readonly GLOBAL_COMMISSION_KEY;
    private readonly DEFAULT_COMMISSION_RATE;
    constructor(prisma: PrismaService, platformWalletService: PlatformWalletService);
    getGlobalCommissionRate(): Promise<number>;
    updateGlobalCommissionRate(commissionRate: number): Promise<number>;
    updateFieldCommissionRate(fieldId: string, commissionRate: number | null): Promise<{
        id: string;
        name: string;
        commissionRate: number | null;
    }>;
    resolveCommissionRate(fieldId: string): Promise<number>;
    getAllSettings(): Promise<{
        key: string;
        value: string;
        dataType: string;
        updatedAt: Date;
    }[]>;
    getSetting(key: string): Promise<{
        key: string;
        value: string;
        dataType: string;
        updatedAt: Date;
    }>;
    updateSetting(key: string, value: string, dataType?: string): Promise<{
        key: string;
        value: string;
        dataType: string;
        updatedAt: Date;
    }>;
    deleteReview(reviewId: string, adminId: string): Promise<{
        message: string;
    }>;
    getDashboardMetrics(): Promise<{
        activeBookings: number;
        pendingPayments: number;
        totalUsers: number;
        totalFields: number;
        totalBookings: number;
        todayRevenue: number;
        todayCommission: number;
    }>;
    getRevenueReport(startDate: string, endDate: string, groupBy?: string): Promise<{
        totalCommission: number;
        byGateway: {
            gateway: import(".prisma/client").$Enums.PaymentGateway;
            commission: number;
        }[];
        byField: {
            fieldId: string;
            fieldName: string;
            commission: number;
            bookingCount: number;
        }[];
        byDate: {
            date: string;
            commission: number;
        }[];
    }>;
    getBookingStatistics(startDate: string, endDate: string): Promise<{
        totalBookings: number;
        byStatus: {
            cancelled: number;
            noShows: number;
            completed: number;
            confirmed: number;
            checkedIn: number;
            pendingPayment: number;
            paymentFailed: number;
        };
        completionRate: number;
        byDate: {
            date: string;
            count: number;
        }[];
    }>;
    getUserStatistics(): Promise<{
        totalUsers: number;
        byRole: {
            players: number;
            fieldOwners: number;
            admins: number;
        };
        activeUsers: number;
        registrationTrends: {
            month: string;
            count: number;
        }[];
    }>;
    getFieldStatistics(): Promise<{
        totalFields: number;
        fields: {
            fieldId: string;
            fieldName: string;
            address: string;
            ownerEmail: string;
            bookingCount: number;
            revenue: number;
            averageRating: number | null;
            totalReviews: number;
        }[];
    }>;
    exportReport(reportType: string, startDate: string, endDate: string): Promise<string>;
    private generateRevenueCSV;
    private generateBookingCSV;
    private generateUserCSV;
    private generateFieldCSV;
    getUsers(page?: number, limit?: number): Promise<{
        users: {
            id: string;
            createdAt: Date;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
            suspendedUntil: Date | null;
            noShowCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    suspendUser(userId: string, suspendedUntil: string | null): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        suspendedUntil: Date | null;
    }>;
    topupUserWallet(userId: string, amount: number, description?: string): Promise<{
        transactionId: string;
        userId: string;
        amount: string;
        previousBalance: string;
        newBalance: string;
    }>;
    getBookings(query: {
        page?: number;
        limit?: number;
        status?: string;
        fieldId?: string;
        ownerId?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        bookings: {
            id: string;
            bookingCode: string;
            player: {
                id: string;
                name: string;
                email: string;
                phone: string;
            };
            field: {
                id: string;
                name: string;
                address: any;
            };
            owner: {
                id: string;
                name: string;
                email: string;
            };
            date: string;
            startTime: string;
            endTime: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            paymentStatus: string;
            totalPrice: number;
            depositAmount: number;
            remainingAmount: number;
            commissionAmount: number;
            commissionRate: number;
            ownerRevenue: number;
            refundAmount: number;
            cancelledAt: string | null;
            isCheckedIn: boolean;
            checkedInAt: any;
            hasQr: boolean;
            qrToken: any;
            qrUsed: any;
            qrUsedAt: any;
            createdAt: string;
            updatedAt: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getFields(query: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        ownerId?: string;
    }): Promise<{
        fields: {
            id: string;
            name: string;
            location: string;
            owner: {
                id: string;
                name: string;
                email: string;
            };
            pricePerHour: number | null;
            status: any;
            commissionPercentage: number;
            isCustomCommission: boolean;
            createdAt: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createField(data: {
        ownerId: string;
        name: string;
        nameAr?: string;
        description?: string;
        descriptionAr?: string;
        address: string;
        addressAr?: string;
        latitude?: number;
        longitude?: number;
        basePrice?: number;
        commissionRate?: number;
    }): Promise<{
        owner: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        deletedAt: Date | null;
        description: string | null;
        address: string;
        latitude: number | null;
        longitude: number | null;
        basePrice: Prisma.Decimal | null;
        commissionRate: Prisma.Decimal | null;
        ownerId: string;
        nameAr: string | null;
        descriptionAr: string | null;
        addressAr: string | null;
        averageRating: number | null;
        totalReviews: number;
        status: import(".prisma/client").$Enums.FieldStatus;
    }>;
    updateField(fieldId: string, data: {
        name?: string;
        nameAr?: string;
        description?: string;
        descriptionAr?: string;
        address?: string;
        addressAr?: string;
        latitude?: number;
        longitude?: number;
        basePrice?: number;
        commissionRate?: number;
    }): Promise<{
        owner: {
            id: string;
            name: string | null;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        deletedAt: Date | null;
        description: string | null;
        address: string;
        latitude: number | null;
        longitude: number | null;
        basePrice: Prisma.Decimal | null;
        commissionRate: Prisma.Decimal | null;
        ownerId: string;
        nameAr: string | null;
        descriptionAr: string | null;
        addressAr: string | null;
        averageRating: number | null;
        totalReviews: number;
        status: import(".prisma/client").$Enums.FieldStatus;
    }>;
    updateFieldStatus(fieldId: string, status: string): Promise<{
        id: string;
        updatedAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.FieldStatus;
    }>;
    deleteField(fieldId: string): Promise<{
        fieldId: string;
        message: string;
    }>;
    getUsersWithFilters(query: {
        page?: number;
        limit?: number;
        email?: string;
        role?: string;
        isVerified?: boolean;
        isSuspended?: boolean;
    }): Promise<{
        users: {
            id: string;
            createdAt: Date;
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
            phoneNumber: string | null;
            isSuspended: boolean;
            suspendedUntil: Date | null;
            noShowCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getSettings(): Promise<{
        globalCommissionPercentage: number;
        depositPercentage: number;
        cancellationRefundWindowHours: number;
    }>;
    updateSettings(data: {
        globalCommissionPercentage?: number;
        depositPercentage?: number;
        cancellationRefundWindowHours?: number;
    }): Promise<{
        globalCommissionPercentage: number;
        depositPercentage: number;
        cancellationRefundWindowHours: number;
    }>;
    getWalletTransactions(query: {
        page?: number;
        limit?: number;
        userId?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        transactions: {
            id: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amount: number;
            balanceBefore: number;
            balanceAfter: number;
            description: string | null;
            reference: string | null;
            metadata: Prisma.JsonValue;
            createdAt: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getPlatformWallet(): Promise<{
        id: any;
        balance: number;
        createdAt: any;
        updatedAt: any;
    }>;
    getPlatformWalletSummary(): Promise<{
        currentBalance: number;
        totalCollected: number;
        totalRefunded: number;
        totalWithdrawn: number;
        totalAdjustments: number;
        netFlow: number;
        totalRefundLiability: number;
        counts: {
            deposits: number;
            refunds: number;
            withdrawals: number;
            adjustments: number;
        };
    }>;
    getPlatformWalletTransactions(page?: number, limit?: number, type?: string, bookingId?: string): Promise<{
        transactions: any[];
        pagination: {
            page: number;
            limit: number;
            total: any;
            totalPages: number;
        };
    }>;
    platformWalletWithdraw(amount: number, payoutMethod: string, payoutDetails: Record<string, any>, description?: string, reference?: string): Promise<{
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
    getWithdrawalRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: {
            owner?: any;
            id: any;
            amount: number;
            status: any;
            paymentMethod: any;
            accountDetails: any;
            payoutId: any;
            rejectionReason: any;
            processedAt: any;
            createdAt: any;
            updatedAt: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    approveWithdrawalRequest(requestId: string, adminId: string, transactionRef?: string): Promise<{
        owner?: any;
        id: any;
        amount: number;
        status: any;
        paymentMethod: any;
        accountDetails: any;
        payoutId: any;
        rejectionReason: any;
        processedAt: any;
        createdAt: any;
        updatedAt: any;
    }>;
    rejectWithdrawalRequest(requestId: string, adminId: string, adminNote: string): Promise<{
        owner?: any;
        id: any;
        amount: number;
        status: any;
        paymentMethod: any;
        accountDetails: any;
        payoutId: any;
        rejectionReason: any;
        processedAt: any;
        createdAt: any;
        updatedAt: any;
    }>;
    private formatWithdrawalRequest;
}
