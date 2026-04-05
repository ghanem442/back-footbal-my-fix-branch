import { PrismaService } from '@modules/prisma/prisma.service';
export interface AuthAttemptLog {
    userId?: string;
    email: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
}
export declare class AuthLoggerService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    logAuthAttempt(attempt: AuthAttemptLog): Promise<void>;
    logSuccessfulLogin(userId: string, email: string, ipAddress: string, userAgent?: string): Promise<void>;
    logFailedLogin(email: string, ipAddress: string, reason: string, userAgent?: string): Promise<void>;
}
