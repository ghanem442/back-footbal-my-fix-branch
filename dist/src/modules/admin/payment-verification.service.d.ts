import { PrismaService } from '@modules/prisma/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { BookingConfirmationService } from '@modules/bookings/booking-confirmation.service';
import { PaymentAuditLogService } from './payment-audit-log.service';
import { ListPendingPaymentsDto } from './dto/payment-verification.dto';
export declare class PaymentVerificationService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly bookingConfirmationService;
    private readonly auditLogService;
    private readonly logger;
    private readonly lockTimeoutMinutes;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, bookingConfirmationService: BookingConfirmationService, auditLogService: PaymentAuditLogService);
    lockPayment(paymentId: string, adminId: string): Promise<{
        locked: boolean;
        expiresIn: number;
    }>;
    unlockPayment(paymentId: string, adminId: string): Promise<{
        unlocked: boolean;
    }>;
    getPendingPayments(dto: ListPendingPaymentsDto): Promise<{
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
    }>;
    approvePayment(paymentId: string, adminId: string): Promise<{
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
    }>;
    rejectPayment(paymentId: string, adminId: string, reason: string): Promise<{
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
    }>;
    getVerificationStatistics(startDate?: Date, endDate?: Date): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        approvalRate: number;
        rejectionRate: number;
        averageVerificationTimeMinutes: number;
    }>;
}
