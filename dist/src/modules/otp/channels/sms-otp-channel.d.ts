import { AppConfigService } from '@config/config.service';
import { OtpChannel } from './otp-channel.interface';
export declare class SmsOtpChannel implements OtpChannel {
    private configService;
    private readonly logger;
    private twilioClient;
    private fromPhoneNumber;
    constructor(configService: AppConfigService);
    private initializeTwilio;
    send(phoneNumber: string, code: string): Promise<void>;
}
