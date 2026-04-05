import { OtpChannel } from '@prisma/client';
export declare class SendOtpDto {
    userId: string;
    channel: OtpChannel;
    purpose: string;
}
