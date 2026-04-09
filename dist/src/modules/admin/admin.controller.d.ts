import { AdminService } from './admin.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PaymentAccountSettingsService } from './payment-account-settings.service';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentAuditLogService } from './payment-audit-log.service';
import { UpdateGlobalCommissionDto, UpdateFieldCommissionDto, UpdateSettingDto, DateRangeQueryDto, ExportReportDto, SuspendUserDto, TopupWalletDto, ListBookingsQueryDto, ListFieldsQueryDto, ListUsersQueryDto, CreateFieldDto, UpdateFieldDto, UpdateFieldStatusDto, UpdateSettingsDto, PlatformWalletWithdrawDto } from './dto';
import { CreatePaymentAccountDto, UpdatePaymentAccountDto } from './dto/payment-account-settings.dto';
import { RejectPaymentDto, ListPendingPaymentsDto } from './dto/payment-verification.dto';
import { Response } from 'express';
export declare class AdminController {
    private readonly adminService;
    private readonly paymentAccountSettingsService;
    private readonly paymentVerificationService;
    private readonly paymentAuditLogService;
    private readonly prisma;
    private readonly logger;
    constructor(adminService: AdminService, paymentAccountSettingsService: PaymentAccountSettingsService, paymentVerificationService: PaymentVerificationService, paymentAuditLogService: PaymentAuditLogService, prisma: PrismaService);
    getGlobalCommissionRate(): Promise<{
        success: boolean;
        data: {
            commissionRate: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateGlobalCommissionRate(updateGlobalCommissionDto: UpdateGlobalCommissionDto): Promise<{
        success: boolean;
        data: {
            commissionRate: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getFieldCommissionRate(fieldId: string): Promise<{
        success: boolean;
        data: {
            fieldId: string;
            commissionRate: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateFieldCommissionRate(fieldId: string, updateFieldCommissionDto: UpdateFieldCommissionDto): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string;
            commissionRate: number | null;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getAllSettings(): Promise<{
        success: boolean;
        data: {
            settings: {
                key: string;
                value: string;
                dataType: string;
                updatedAt: Date;
            }[];
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getSetting(key: string): Promise<{
        success: boolean;
        data: {
            key: string;
            value: string;
            dataType: string;
            updatedAt: Date;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateSetting(key: string, updateSettingDto: UpdateSettingDto): Promise<{
        success: boolean;
        data: {
            key: string;
            value: string;
            dataType: string;
            updatedAt: Date;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    deleteReview(id: string, userId: string): Promise<{
        success: boolean;
        data: {
            message: string;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getDashboard(): Promise<{
        success: boolean;
        data: {
            activeBookings: number;
            pendingPayments: number;
            totalUsers: number;
            totalFields: number;
            totalBookings: number;
            todayRevenue: number;
            todayCommission: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getRevenueReport(query: DateRangeQueryDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getBookingStatistics(query: DateRangeQueryDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getUserStatistics(): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getFieldStatistics(): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    exportReport(exportReportDto: ExportReportDto, res: Response): Promise<void>;
    getUsers(query: ListUsersQueryDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    suspendUser(id: string, suspendUserDto: SuspendUserDto): Promise<{
        success: boolean;
        data: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            suspendedUntil: Date | null;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    topupWallet(topupWalletDto: TopupWalletDto): Promise<{
        success: boolean;
        data: {
            transactionId: string;
            userId: string;
            amount: string;
            previousBalance: string;
            newBalance: string;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getBookings(query: ListBookingsQueryDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getFields(query: ListFieldsQueryDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    createField(createFieldDto: CreateFieldDto): Promise<{
        success: boolean;
        data: {
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
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateField(fieldId: string, updateFieldDto: UpdateFieldDto): Promise<{
        success: boolean;
        data: {
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
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    deleteField(fieldId: string): Promise<{
        success: boolean;
        data: {
            fieldId: string;
            message: string;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateFieldStatus(fieldId: string, updateFieldStatusDto: UpdateFieldStatusDto): Promise<{
        success: boolean;
        data: {
            id: string;
            updatedAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getSystemSettings(): Promise<{
        success: boolean;
        data: {
            globalCommissionPercentage: number;
            depositPercentage: number;
            cancellationRefundWindowHours: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updateSystemSettings(updateSettingsDto: UpdateSettingsDto): Promise<{
        success: boolean;
        data: {
            globalCommissionPercentage: number;
            depositPercentage: number;
            cancellationRefundWindowHours: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPlatformWallet(): Promise<{
        success: boolean;
        data: {
            id: any;
            balance: number;
            createdAt: any;
            updatedAt: any;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPlatformWalletSummary(): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPlatformWalletTransactions(page?: string, limit?: string, type?: string, bookingId?: string): Promise<{
        success: boolean;
        data: {
            transactions: any[];
            pagination: {
                page: number;
                limit: number;
                total: any;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    platformWalletWithdraw(body: PlatformWalletWithdrawDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getWithdrawalRequests(status?: string, page?: string, limit?: string): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    approveWithdrawalRequest(id: string, adminId: string, body: {
        transactionRef?: string;
    }): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    rejectWithdrawalRequest(id: string, adminId: string, body: {
        adminNote: string;
    }): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getWalletTransactions(page?: string, limit?: string, userId?: string, type?: string, startDate?: string, endDate?: string): Promise<{
        success: boolean;
        data: {
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
                metadata: import("@prisma/client/runtime/library").JsonValue;
                createdAt: string;
            }[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    createPaymentAccount(dto: CreatePaymentAccountDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    updatePaymentAccount(id: string, dto: UpdatePaymentAccountDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPaymentAccounts(): Promise<{
        success: boolean;
        data: {
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
        }[];
        message: {
            en: string;
            ar: string;
        };
    }>;
    deletePaymentAccount(id: string): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPendingVerifications(dto: ListPendingPaymentsDto): Promise<{
        success: boolean;
        data: {
            payments: {
                id: string;
                bookingId: string;
                amount: string;
                gateway: import(".prisma/client").$Enums.PaymentGateway;
                screenshotUrl: string | null;
                playerNotes: string | null;
                createdAt: Date;
                player: {
                    id: string;
                    name: string | null;
                    email: string;
                    phoneNumber: string | null;
                };
                booking: {
                    id: string;
                    bookingNumber: string | null;
                    fieldName: string;
                    fieldNameAr: string | null;
                    scheduledDate: Date;
                    scheduledStartTime: Date;
                    scheduledEndTime: Date;
                };
            }[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    lockPayment(id: string, adminId: string): Promise<{
        success: boolean;
        data: {
            locked: boolean;
            expiresIn: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    unlockPayment(id: string, adminId: string): Promise<{
        success: boolean;
        data: {
            unlocked: boolean;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    approvePayment(id: string, adminId: string): Promise<{
        success: boolean;
        data: {
            payment: {
                id: string;
                verificationStatus: string;
                verifiedBy: string;
                verifiedAt: Date;
            };
            booking: {
                field: {
                    id: string;
                    name: string;
                    address: string;
                    ownerId: string;
                };
                timeSlot: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    date: Date;
                    status: import(".prisma/client").$Enums.SlotStatus;
                    fieldId: string;
                    startTime: Date;
                    endTime: Date;
                    price: import("@prisma/client/runtime/library").Decimal;
                };
                payment: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    verifiedAt: Date | null;
                    status: import(".prisma/client").$Enums.PaymentStatus;
                    bookingId: string;
                    amount: import("@prisma/client/runtime/library").Decimal;
                    gateway: import(".prisma/client").$Enums.PaymentGateway;
                    transactionId: string | null;
                    currency: string;
                    gatewayResponse: import("@prisma/client/runtime/library").JsonValue | null;
                    referenceCode: string | null;
                    screenshotUrl: string | null;
                    verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
                    verifiedBy: string | null;
                    rejectionReason: string | null;
                    playerNotes: string | null;
                    userTransactionId: string | null;
                    userSenderNumber: string | null;
                    verificationLockedBy: string | null;
                    verificationLockedAt: Date | null;
                    uploadAttempts: number;
                    lastUploadAt: Date | null;
                    paymentExpiresAt: Date | null;
                    isFlagged: boolean;
                    flagReason: string | null;
                } | null;
                player: {
                    id: string;
                    email: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                commissionRate: import("@prisma/client/runtime/library").Decimal;
                status: import(".prisma/client").$Enums.BookingStatus;
                fieldId: string;
                bookingNumber: string | null;
                playerId: string;
                timeSlotId: string;
                scheduledDate: Date;
                scheduledStartTime: Date;
                scheduledEndTime: Date;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                depositAmount: import("@prisma/client/runtime/library").Decimal;
                commissionAmount: import("@prisma/client/runtime/library").Decimal;
                ownerRevenue: import("@prisma/client/runtime/library").Decimal;
                cancellationDeadline: Date | null;
                paymentDeadline: Date | null;
                cancelledAt: Date | null;
                cancelledBy: string | null;
                refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    rejectPayment(id: string, adminId: string, dto: RejectPaymentDto): Promise<{
        success: boolean;
        data: {
            payment: {
                id: string;
                verificationStatus: string;
                verifiedBy: string;
                verifiedAt: Date;
                rejectionReason: string;
            };
            booking: {
                id: string;
                status: string;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getVerificationStatistics(startDate?: string, endDate?: string): Promise<{
        success: boolean;
        data: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
            approvalRate: number;
            rejectionRate: number;
            averageVerificationTimeMinutes: number;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getFlaggedPayments(page?: string, limit?: string): Promise<{
        success: boolean;
        data: {
            payments: ({
                booking: {
                    field: {
                        name: string;
                    };
                    player: {
                        id: string;
                        name: string | null;
                        email: string;
                        phoneNumber: string | null;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    commissionRate: import("@prisma/client/runtime/library").Decimal;
                    status: import(".prisma/client").$Enums.BookingStatus;
                    fieldId: string;
                    bookingNumber: string | null;
                    playerId: string;
                    timeSlotId: string;
                    scheduledDate: Date;
                    scheduledStartTime: Date;
                    scheduledEndTime: Date;
                    totalPrice: import("@prisma/client/runtime/library").Decimal;
                    depositAmount: import("@prisma/client/runtime/library").Decimal;
                    commissionAmount: import("@prisma/client/runtime/library").Decimal;
                    ownerRevenue: import("@prisma/client/runtime/library").Decimal;
                    cancellationDeadline: Date | null;
                    paymentDeadline: Date | null;
                    cancelledAt: Date | null;
                    cancelledBy: string | null;
                    refundAmount: import("@prisma/client/runtime/library").Decimal | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                verifiedAt: Date | null;
                status: import(".prisma/client").$Enums.PaymentStatus;
                bookingId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                gateway: import(".prisma/client").$Enums.PaymentGateway;
                transactionId: string | null;
                currency: string;
                gatewayResponse: import("@prisma/client/runtime/library").JsonValue | null;
                referenceCode: string | null;
                screenshotUrl: string | null;
                verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
                verifiedBy: string | null;
                rejectionReason: string | null;
                playerNotes: string | null;
                userTransactionId: string | null;
                userSenderNumber: string | null;
                verificationLockedBy: string | null;
                verificationLockedAt: Date | null;
                uploadAttempts: number;
                lastUploadAt: Date | null;
                paymentExpiresAt: Date | null;
                isFlagged: boolean;
                flagReason: string | null;
            })[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    flagPayment(id: string, adminId: string, body: {
        reason: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            verifiedAt: Date | null;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gateway: import(".prisma/client").$Enums.PaymentGateway;
            transactionId: string | null;
            currency: string;
            gatewayResponse: import("@prisma/client/runtime/library").JsonValue | null;
            referenceCode: string | null;
            screenshotUrl: string | null;
            verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
            verifiedBy: string | null;
            rejectionReason: string | null;
            playerNotes: string | null;
            userTransactionId: string | null;
            userSenderNumber: string | null;
            verificationLockedBy: string | null;
            verificationLockedAt: Date | null;
            uploadAttempts: number;
            lastUploadAt: Date | null;
            paymentExpiresAt: Date | null;
            isFlagged: boolean;
            flagReason: string | null;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    unflagPayment(id: string, adminId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            verifiedAt: Date | null;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gateway: import(".prisma/client").$Enums.PaymentGateway;
            transactionId: string | null;
            currency: string;
            gatewayResponse: import("@prisma/client/runtime/library").JsonValue | null;
            referenceCode: string | null;
            screenshotUrl: string | null;
            verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
            verifiedBy: string | null;
            rejectionReason: string | null;
            playerNotes: string | null;
            userTransactionId: string | null;
            userSenderNumber: string | null;
            verificationLockedBy: string | null;
            verificationLockedAt: Date | null;
            uploadAttempts: number;
            lastUploadAt: Date | null;
            paymentExpiresAt: Date | null;
            isFlagged: boolean;
            flagReason: string | null;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getPaymentAuditLogs(id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            reason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            paymentId: string;
            adminId: string;
            action: string;
            previousStatus: string | null;
            newStatus: string | null;
            ipAddress: string | null;
            userAgent: string | null;
        }[];
        message: {
            en: string;
            ar: string;
        };
    }>;
    getMyAuditLogs(adminId: string, page?: string, limit?: string): Promise<{
        success: boolean;
        data: {
            logs: {
                id: string;
                createdAt: Date;
                reason: string | null;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                paymentId: string;
                adminId: string;
                action: string;
                previousStatus: string | null;
                newStatus: string | null;
                ipAddress: string | null;
                userAgent: string | null;
            }[];
            pagination: {
                page: number;
                limit: number;
                total: number;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getAllAdminsPerformance(startDate?: string, endDate?: string): Promise<{
        success: boolean;
        data: {
            totalActions: number;
            approvals: number;
            rejections: number;
            approvalRate: number;
            rejectionRate: number;
            averageVerificationTimeMinutes: number;
            adminId: string;
            adminName: string | null;
            adminEmail: string;
        }[];
        message: {
            en: string;
            ar: string;
        };
    }>;
}
