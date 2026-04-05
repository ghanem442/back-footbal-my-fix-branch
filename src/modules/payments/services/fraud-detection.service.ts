import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';

export interface FraudCheckResult {
  isSuspicious: boolean;
  riskScore: number; // 0-100
  flags: string[];
  shouldAutoFlag: boolean;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze payment for suspicious patterns
   */
  async analyzeFraudRisk(paymentId: string, userId: string): Promise<FraudCheckResult> {
    const flags: string[] = [];
    let riskScore = 0;

    // Get payment details
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!payment) {
      return { isSuspicious: false, riskScore: 0, flags: [], shouldAutoFlag: false };
    }

    // Check 1: Multiple uploads in short time
    if (payment.uploadAttempts >= 3) {
      flags.push('MULTIPLE_UPLOAD_ATTEMPTS');
      riskScore += 30;
    }

    // Check 2: Recent uploads from same user
    const recentUploads = await this.prisma.payment.count({
      where: {
        booking: { playerId: userId },
        lastUploadAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
        id: { not: paymentId },
      },
    });

    if (recentUploads >= 3) {
      flags.push('RAPID_MULTIPLE_UPLOADS');
      riskScore += 25;
    }

    // Check 3: Same amount + similar timing from different users
    const similarPayments = await this.prisma.payment.count({
      where: {
        amount: payment.amount,
        gateway: payment.gateway,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
        },
        booking: {
          playerId: { not: userId },
        },
      },
    });

    if (similarPayments >= 3) {
      flags.push('SIMILAR_AMOUNT_TIMING');
      riskScore += 20;
    }

    // Check 4: User has previous rejected payments
    const rejectedCount = await this.prisma.payment.count({
      where: {
        booking: { playerId: userId },
        verificationStatus: 'REJECTED',
      },
    });

    if (rejectedCount >= 2) {
      flags.push('PREVIOUS_REJECTIONS');
      riskScore += 15;
    }

    // Check 5: New user (account created < 24 hours ago)
    const userAge = Date.now() - payment.booking.player.createdAt.getTime();
    const hoursOld = userAge / (1000 * 60 * 60);

    if (hoursOld < 24) {
      flags.push('NEW_USER_ACCOUNT');
      riskScore += 10;
    }

    // Check 6: Payment near expiry (possible rush/panic)
    if (payment.paymentExpiresAt) {
      const timeUntilExpiry = payment.paymentExpiresAt.getTime() - Date.now();
      const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

      if (minutesUntilExpiry < 5 && minutesUntilExpiry > 0) {
        flags.push('NEAR_EXPIRY_UPLOAD');
        riskScore += 5;
      }
    }

    const isSuspicious = riskScore >= 50;
    const shouldAutoFlag = riskScore >= 70;

    if (isSuspicious) {
      this.logger.warn(
        `Suspicious payment detected: ${paymentId}, Risk Score: ${riskScore}, Flags: ${flags.join(', ')}`,
      );
    }

    return {
      isSuspicious,
      riskScore,
      flags,
      shouldAutoFlag,
    };
  }

  /**
   * Flag payment for manual review
   */
  async flagPayment(paymentId: string, reason: string, metadata?: any) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        isFlagged: true,
        flagReason: reason,
        gatewayResponse: metadata ? { ...metadata, flaggedAt: new Date() } : undefined,
      },
    });

    this.logger.log(`Payment ${paymentId} flagged: ${reason}`);
  }

  /**
   * Unflag payment
   */
  async unflagPayment(paymentId: string) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        isFlagged: false,
        flagReason: null,
      },
    });

    this.logger.log(`Payment ${paymentId} unflagged`);
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {
      gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalPayments, flaggedPayments, rejectedPayments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, isFlagged: true } }),
      this.prisma.payment.count({ where: { ...where, verificationStatus: 'REJECTED' } }),
    ]);

    return {
      totalPayments,
      flaggedPayments,
      rejectedPayments,
      flagRate: totalPayments > 0 ? Math.round((flaggedPayments / totalPayments) * 100) : 0,
      rejectionRate: totalPayments > 0 ? Math.round((rejectedPayments / totalPayments) * 100) : 0,
    };
  }
}
