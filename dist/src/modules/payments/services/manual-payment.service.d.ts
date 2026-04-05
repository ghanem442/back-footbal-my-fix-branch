import { PrismaService } from '@modules/prisma/prisma.service';
import { StorageService } from '@modules/storage/storage.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { PaymentReferenceService } from './payment-reference.service';
import { FraudDetectionService } from './fraud-detection.service';
export declare class ManualPaymentService {
    private readonly prisma;
    private readonly storageService;
    private readonly notificationsService;
    private readonly configService;
    private readonly paymentReferenceService;
    private readonly fraudDetectionService;
    private readonly logger;
    private readonly maxFileSize;
    private readonly maxUploadAttempts;
    private readonly paymentExpiryMinutes;
    constructor(prisma: PrismaService, storageService: StorageService, notificationsService: NotificationsService, configService: ConfigService, paymentReferenceService: PaymentReferenceService, fraudDetectionService: FraudDetectionService);
    getPaymentInstructions(gateway: string): Promise<{
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
    }>;
    createManualPayment(bookingId: string, gateway: string, amount: number): Promise<{
        paymentId: string;
        referenceCode: string;
        paymentExpiresAt: Date;
        expiryMinutes: number;
    }>;
    uploadScreenshot(paymentId: string, userId: string, file: Express.Multer.File, notes?: string, transactionId?: string, senderNumber?: string): Promise<{
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
    }>;
    getVerificationStatus(paymentId: string, userId: string): Promise<{
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
    }>;
    private expirePayment;
}
