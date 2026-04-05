import { AppConfigService } from '@config/config.service';
import { OtpChannel } from './otp-channel.interface';
export declare class EmailOtpChannel implements OtpChannel {
    private configService;
    private readonly logger;
    private sendGridConfigured;
    private fromEmail;
    private fromName;
    constructor(configService: AppConfigService);
    private initializeSendGrid;
    send(email: string, code: string): Promise<void>;
    private buildEmailHtml;
}
