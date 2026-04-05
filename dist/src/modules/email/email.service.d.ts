import { AppConfigService } from '@config/config.service';
export declare class EmailService {
    private configService;
    private readonly logger;
    private transporter;
    constructor(configService: AppConfigService);
    private initializeTransporter;
    sendEmailVerification(email: string, verificationToken: string): Promise<void>;
    private logVerificationEmail;
    sendPasswordResetEmail(email: string, resetToken: string, resetUrl?: string): Promise<void>;
    private logEmail;
    sendPasswordResetConfirmation(email: string): Promise<void>;
    private logConfirmationEmail;
}
