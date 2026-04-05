import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
export declare class QrService {
    private readonly prisma;
    private readonly storage;
    private readonly logger;
    constructor(prisma: PrismaService, storage: StorageService);
    private generateQrToken;
    private generateQrCodeImage;
    generateQrCodeForBooking(bookingId: string): Promise<{
        id: string;
        qrToken: string;
        imageUrl: string;
    }>;
    getQrCodeByBookingId(bookingId: string): Promise<{
        id: string;
        createdAt: Date;
        isUsed: boolean;
        usedAt: Date | null;
        bookingId: string;
        qrToken: string;
        imageUrl: string;
    } | null>;
    getQrCodeByToken(qrToken: string): Promise<({
        booking: {
            field: {
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
            player: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                email: string;
                passwordHash: string | null;
                role: import(".prisma/client").$Enums.Role;
                isVerified: boolean;
                emailVerifiedAt: Date | null;
                preferredLanguage: string;
                phoneNumber: string | null;
                isSuspended: boolean;
                suspendedUntil: Date | null;
                noShowCount: number;
                oauthId: string | null;
                authProvider: string | null;
                deletedAt: Date | null;
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
        isUsed: boolean;
        usedAt: Date | null;
        bookingId: string;
        qrToken: string;
        imageUrl: string;
    }) | null>;
    markQrCodeAsUsed(qrToken: string): Promise<void>;
}
