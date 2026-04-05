import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';

export interface AuditLogEntry {
  paymentId: string;
  adminId: string;
  action: 'APPROVED' | 'REJECTED' | 'LOCKED' | 'UNLOCKED' | 'FLAGGED' | 'UNFLAGGED';
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class PaymentAuditLogService {
  private readonly logger = new Logger(PaymentAuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create audit log entry
   */
  async log(entry: AuditLogEntry) {
    try {
      await this.prisma.paymentVerificationAuditLog.create({
        data: {
          paymentId: entry.paymentId,
          adminId: entry.adminId,
          action: entry.action,
          previousStatus: entry.previousStatus,
          newStatus: entry.newStatus,
          reason: entry.reason,
          metadata: entry.metadata || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });

      this.logger.log(
        `Audit log: ${entry.action} on payment ${entry.paymentId} by admin ${entry.adminId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${(error as Error).message}`);
    }
  }

  /**
   * Get audit logs for a payment
   */
  async getPaymentAuditLogs(paymentId: string) {
    return this.prisma.paymentVerificationAuditLog.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit logs for a payment (alias)
   */
  async getPaymentLogs(paymentId: string) {
    return this.getPaymentAuditLogs(paymentId);
  }

  /**
   * Get audit logs for an admin
   */
  async getAdminAuditLogs(adminId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.paymentVerificationAuditLog.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentVerificationAuditLog.count({ where: { adminId } }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for an admin (alias)
   */
  async getAdminLogs(adminId: string, page = 1, limit = 50) {
    return this.getAdminAuditLogs(adminId, page, limit);
  }

  /**
   * Get admin performance statistics
   */
  async getAdminStatistics(adminId: string, startDate?: Date, endDate?: Date) {
    const where: any = { adminId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalActions, approvals, rejections] = await Promise.all([
      this.prisma.paymentVerificationAuditLog.count({ where }),
      this.prisma.paymentVerificationAuditLog.count({ where: { ...where, action: 'APPROVED' } }),
      this.prisma.paymentVerificationAuditLog.count({ where: { ...where, action: 'REJECTED' } }),
    ]);

    // Calculate average verification time
    const approvedLogs = await this.prisma.paymentVerificationAuditLog.findMany({
      where: { ...where, action: 'APPROVED' },
      select: {
        paymentId: true,
        createdAt: true,
      },
    });

    let averageVerificationTimeMinutes = 0;
    if (approvedLogs.length > 0) {
      const payments = await this.prisma.payment.findMany({
        where: {
          id: { in: approvedLogs.map((log) => log.paymentId) },
        },
        select: {
          id: true,
          lastUploadAt: true,
        },
      });

      const paymentMap = new Map(payments.map((p) => [p.id, p]));

      let totalMinutes = 0;
      let validCount = 0;

      for (const log of approvedLogs) {
        const payment = paymentMap.get(log.paymentId);
        if (payment?.lastUploadAt) {
          const diff = log.createdAt.getTime() - payment.lastUploadAt.getTime();
          totalMinutes += diff / (1000 * 60);
          validCount++;
        }
      }

      if (validCount > 0) {
        averageVerificationTimeMinutes = Math.round(totalMinutes / validCount);
      }
    }

    return {
      totalActions,
      approvals,
      rejections,
      approvalRate: totalActions > 0 ? Math.round((approvals / totalActions) * 100) : 0,
      rejectionRate: totalActions > 0 ? Math.round((rejections / totalActions) * 100) : 0,
      averageVerificationTimeMinutes,
    };
  }

  /**
   * Get all admins performance comparison
   */
  async getAllAdminsStatistics(startDate?: Date, endDate?: Date) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true },
    });

    const statistics = await Promise.all(
      admins.map(async (admin) => {
        const stats = await this.getAdminStatistics(admin.id, startDate, endDate);
        return {
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          ...stats,
        };
      }),
    );

    return statistics.sort((a, b) => b.totalActions - a.totalActions);
  }

  /**
   * Get all admins performance comparison (alias)
   */
  async getAdminPerformance(startDate?: Date, endDate?: Date) {
    return this.getAllAdminsStatistics(startDate, endDate);
  }
}
