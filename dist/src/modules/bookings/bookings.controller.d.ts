import { BookingsService } from './bookings.service';
import { CreateBookingDto, CancelBookingDto, QueryOwnerBookingsDto } from './dto';
import { BookingStatus } from '@prisma/client';
import { QrService } from '../qr/qr.service';
export declare class BookingsController {
    private readonly bookingsService;
    private readonly qrService;
    constructor(bookingsService: BookingsService, qrService: QrService);
    createBooking(req: any, dto: CreateBookingDto): Promise<{
        field: {
            id: string;
            name: string;
            address: string;
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
    }>;
    getUserBookings(req: any, status?: BookingStatus, fieldId?: string, startDate?: string, endDate?: string, page?: number, limit?: number): Promise<{
        bookings: {
            id: string;
            bookingNumber: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
            scheduledDate: Date;
            scheduledStartTime: Date;
            scheduledEndTime: Date;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            depositAmount: import("@prisma/client/runtime/library").Decimal;
            remainingAmount: import("@prisma/client/runtime/library").Decimal;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            paymentDeadline: Date | null;
            cancelledAt: Date | null;
            field: {
                id: string;
                name: string;
                address: string;
            };
            payment: {
                status: import(".prisma/client").$Enums.PaymentStatus;
                gateway: import(".prisma/client").$Enums.PaymentGateway;
            } | null;
            hasQr: boolean;
            qr: {
                token: string;
                imageUrl: string;
                isUsed: boolean;
            } | null;
            canCancel: boolean;
            willGetRefund: boolean;
            hoursUntilBooking: number;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyBookings(req: any, category?: string, page?: number, limit?: number): Promise<{
        bookings: {
            id: string;
            bookingNumber: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
            scheduledDate: Date;
            scheduledStartTime: Date;
            scheduledEndTime: Date;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            depositAmount: import("@prisma/client/runtime/library").Decimal;
            remainingAmount: import("@prisma/client/runtime/library").Decimal;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            paymentDeadline: Date | null;
            cancelledAt: Date | null;
            field: {
                id: string;
                name: string;
                address: string;
            };
            payment: {
                status: import(".prisma/client").$Enums.PaymentStatus;
                gateway: import(".prisma/client").$Enums.PaymentGateway;
            } | null;
            hasQr: boolean;
            qr: {
                token: string;
                imageUrl: string;
                isUsed: boolean;
            } | null;
            canCancel: boolean;
            willGetRefund: boolean;
            hoursUntilBooking: number;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOwnerBookings(req: any, queryDto: QueryOwnerBookingsDto): Promise<{
        success: boolean;
        data: {
            bookings: {
                id: any;
                fieldId: any;
                fieldName: any;
                fieldNameAr: any;
                playerId: any;
                playerName: null;
                email: any;
                phone: any;
                scheduledDate: any;
                scheduledStartTime: any;
                scheduledEndTime: any;
                status: any;
                paymentStatus: any;
                depositAmount: any;
                remainingAmount: any;
                totalPrice: any;
                isCheckedIn: boolean;
                checkedInAt: any;
                hasQr: boolean;
                qrToken: any;
                createdAt: any;
                updatedAt: any;
            }[];
            pagination: {
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    getBookingById(req: any, id: string): Promise<{
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
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
        qrCode: {
            id: string;
            createdAt: Date;
            isUsed: boolean;
            usedAt: Date | null;
            bookingId: string;
            qrToken: string;
            imageUrl: string;
        } | null;
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
    }>;
    cancelBooking(req: any, id: string, dto: CancelBookingDto): Promise<{
        success: boolean;
        data: {
            booking: any;
            refund: {
                amount: number;
                percentage: number;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    markNoShow(req: any, id: string): Promise<{
        success: boolean;
        data: {
            booking: {
                id: string;
                status: import(".prisma/client").$Enums.BookingStatus;
            };
            player: {
                noShowCount: number;
                isSuspended: boolean;
                suspendedUntil: Date | null;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getBookingQrCode(req: any, id: string): Promise<{
        success: boolean;
        data: {
            qrToken: string;
            imageUrl: string;
            isUsed: boolean;
            usedAt: Date | null;
        };
    }>;
}
