import { QrService } from './qr.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { VerifyBookingIdDto } from './dto/verify-booking-id.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class QrController {
    private readonly qrService;
    private readonly prisma;
    constructor(qrService: QrService, prisma: PrismaService);
    validateQrCode(validateQrDto: ValidateQrDto, user: any): Promise<{
        success: boolean;
        message: string;
        data: {
            bookingId: string;
            status: "CHECKED_IN";
            playerName: string;
            fieldName: string;
            scheduledStartTime: Date;
            scheduledEndTime: Date;
        };
    }>;
    verifyBookingId(verifyBookingIdDto: VerifyBookingIdDto, user: any): Promise<{
        success: boolean;
        message: string;
        data: {
            bookingId: string;
            status: "CHECKED_IN";
            playerName: string;
            fieldName: string;
            scheduledStartTime: Date;
            scheduledEndTime: Date;
        };
    }>;
}
