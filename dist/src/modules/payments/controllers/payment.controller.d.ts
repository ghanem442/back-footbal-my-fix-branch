import { RawBodyRequest } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { ManualPaymentService } from '../services/manual-payment.service';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { UploadScreenshotDto } from '../dto/upload-screenshot.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingConfirmationService } from '../../bookings/booking-confirmation.service';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
export declare class PaymentController {
    private readonly paymentService;
    private readonly manualPaymentService;
    private readonly prisma;
    private readonly bookingConfirmationService;
    constructor(paymentService: PaymentService, manualPaymentService: ManualPaymentService, prisma: PrismaService, bookingConfirmationService: BookingConfirmationService);
    paymobCallback(req: any, res: any): Promise<any>;
    devConfirmBooking(body: {
        bookingId: string;
    }): Promise<{
        success: boolean;
        data: {
            bookingId: string;
            bookingNumber: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
        };
        message: string;
    }>;
    initiateDeposit(body: {
        bookingId: string;
        gateway?: string;
    }, user: JwtPayload): Promise<{
        success: boolean;
        data: {
            paymentId: string;
            bookingId: string;
            amount: number;
            currency: string;
            gateway: string;
            redirectUrl: any;
            paymentToken: any;
            iframeId: any;
            reference: string | null;
        };
    } | {
        success: boolean;
        data: {
            paymentId: any;
            bookingId: string;
            amount: number;
            currency: string;
            gateway: string;
            redirectUrl: string | undefined;
            paymentToken: any;
            iframeId: any;
            reference: string;
        };
    }>;
    handlePaymobWebhook(payload: any, hmac?: string): Promise<{
        received: boolean;
    }>;
    initiatePayment(dto: InitiatePaymentDto, user: JwtPayload, idempotencyKey?: string): Promise<{
        success: boolean;
        data: {
            paymentId: string;
            transactionId: string | null;
            status: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            redirectUrl?: undefined;
            bookingId?: undefined;
            gateway?: undefined;
            paymentType?: undefined;
            referenceCode?: undefined;
            paymentExpiresAt?: undefined;
            expiryMinutes?: undefined;
            instructions?: undefined;
            accountDetails?: undefined;
            nextStep?: undefined;
        };
        message: string;
    } | {
        success: boolean;
        data: {
            paymentId: string;
            transactionId: string | null;
            status: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            redirectUrl: any;
            bookingId?: undefined;
            gateway?: undefined;
            paymentType?: undefined;
            referenceCode?: undefined;
            paymentExpiresAt?: undefined;
            expiryMinutes?: undefined;
            instructions?: undefined;
            accountDetails?: undefined;
            nextStep?: undefined;
        };
        message: string;
    } | {
        success: boolean;
        data: {
            paymentId: string;
            bookingId: string;
            amount: number;
            currency: string;
            gateway: "wallet" | "stripe" | "fawry" | "vodafone_cash" | "instapay";
            paymentType: string;
            referenceCode: string;
            paymentExpiresAt: Date;
            expiryMinutes: number;
            instructions: {
                en: string;
                ar: string;
            } | undefined;
            accountDetails: any;
            nextStep: {
                en: string;
                ar: string;
            };
            transactionId?: undefined;
            status?: undefined;
            redirectUrl?: undefined;
        };
        message: {
            en: string;
            ar: string;
        };
    } | {
        success: boolean;
        data: {
            paymentId: string;
            transactionId: string;
            status: "PENDING" | "SUCCESS";
            redirectUrl: string | undefined;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            bookingId?: undefined;
            gateway?: undefined;
            paymentType?: undefined;
            referenceCode?: undefined;
            paymentExpiresAt?: undefined;
            expiryMinutes?: undefined;
            instructions?: undefined;
            accountDetails?: undefined;
            nextStep?: undefined;
        };
        message?: undefined;
    }>;
    handleStripeWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    handleFawryWebhook(payload: any): Promise<{
        received: boolean;
    }>;
    handleVodafoneWebhook(payload: any): Promise<{
        received: boolean;
    }>;
    handleInstaPayWebhook(payload: any): Promise<{
        received: boolean;
    }>;
    getPayment(id: string, user: JwtPayload): Promise<{
        success: boolean;
        data: {
            booking: {
                field: {
                    id: string;
                    status: import(".prisma/client").$Enums.FieldStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    deletedAt: Date | null;
                    ownerId: string;
                    nameAr: string | null;
                    description: string | null;
                    descriptionAr: string | null;
                    address: string;
                    addressAr: string | null;
                    latitude: number | null;
                    longitude: number | null;
                    basePrice: import("@prisma/client/runtime/library").Decimal | null;
                    commissionRate: import("@prisma/client/runtime/library").Decimal | null;
                    averageRating: number | null;
                    totalReviews: number;
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
                status: import(".prisma/client").$Enums.BookingStatus;
                createdAt: Date;
                updatedAt: Date;
                commissionRate: import("@prisma/client/runtime/library").Decimal;
                bookingNumber: string | null;
                playerId: string;
                fieldId: string;
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
            gateway: import(".prisma/client").$Enums.PaymentGateway;
            transactionId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            gatewayResponse: import("@prisma/client/runtime/library").JsonValue | null;
            referenceCode: string | null;
            screenshotUrl: string | null;
            verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
            verifiedBy: string | null;
            verifiedAt: Date | null;
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
            createdAt: Date;
            updatedAt: Date;
            bookingId: string;
        };
    }>;
    private processWebhookResult;
    private mapGatewayToEnum;
    getManualPaymentInfo(gateway: string): Promise<{
        success: boolean;
        data: {
            gateway: string;
            isAvailable: boolean;
            message: {
                en: string;
                ar: string;
            };
            instructions?: undefined;
            accountDetails?: undefined;
        } | {
            gateway: string;
            isAvailable: boolean;
            instructions: {
                en: string;
                ar: string;
            };
            accountDetails: any;
            message?: undefined;
        };
    }>;
    uploadScreenshot(paymentId: string, user: JwtPayload, file: Express.Multer.File, dto: UploadScreenshotDto): Promise<{
        success: boolean;
        data: {
            paymentId: string;
            screenshotUrl: string;
            verificationStatus: string;
            uploadAttempts: number;
            maxUploadAttempts: number;
            fraudCheck: {
                isSuspicious: boolean;
                riskScore: number;
                message: {
                    en: string;
                    ar: string;
                };
            } | undefined;
            message: {
                en: string;
                ar: string;
            };
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    getVerificationStatus(paymentId: string, user: JwtPayload): Promise<{
        success: boolean;
        data: {
            paymentId: string;
            verificationStatus: string;
            message: {
                en: string;
                ar: string;
            };
            referenceCode?: undefined;
            screenshotUrl?: undefined;
            submittedAt?: undefined;
            verifiedAt?: undefined;
            rejectionReason?: undefined;
            paymentExpiresAt?: undefined;
            uploadAttempts?: undefined;
            maxUploadAttempts?: undefined;
            isFlagged?: undefined;
            estimatedVerificationTime?: undefined;
        } | {
            paymentId: string;
            referenceCode: string | null;
            verificationStatus: import(".prisma/client").$Enums.PaymentVerificationStatus;
            screenshotUrl: string | null;
            submittedAt: Date | null;
            verifiedAt: Date | null;
            rejectionReason: string | null;
            paymentExpiresAt: Date | null;
            uploadAttempts: number;
            maxUploadAttempts: number;
            isFlagged: boolean;
            estimatedVerificationTime: string | null;
            message?: undefined;
        };
    }>;
}
