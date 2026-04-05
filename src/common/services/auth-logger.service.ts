import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';

export interface AuthAttemptLog {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

/**
 * Service for logging authentication attempts
 * Implements Requirements 20.7 and 25.2
 */
@Injectable()
export class AuthLoggerService {
  private readonly logger = new Logger(AuthLoggerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an authentication attempt
   * Logs to both application logger and could be extended to database
   */
  async logAuthAttempt(attempt: AuthAttemptLog): Promise<void> {
    const logData = {
      timestamp: new Date().toISOString(),
      email: attempt.email,
      userId: attempt.userId || 'N/A',
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent || 'N/A',
      success: attempt.success,
      failureReason: attempt.failureReason || 'N/A',
    };

    if (attempt.success) {
      this.logger.log(
        `Authentication SUCCESS - User: ${logData.email} (${logData.userId}), IP: ${logData.ipAddress}`,
      );
    } else {
      this.logger.warn(
        `Authentication FAILURE - User: ${logData.email}, IP: ${logData.ipAddress}, Reason: ${logData.failureReason}`,
      );
    }

    // Structured log for machine parsing
    this.logger.debug(JSON.stringify(logData));

    // Could extend to store in database for audit trail
    // await this.prisma.authLog.create({ data: logData });
  }

  /**
   * Log a successful login
   */
  async logSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAuthAttempt({
      userId,
      email,
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * Log a failed login attempt
   */
  async logFailedLogin(
    email: string,
    ipAddress: string,
    reason: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAuthAttempt({
      email,
      ipAddress,
      userAgent,
      success: false,
      failureReason: reason,
    });
  }
}
