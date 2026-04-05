"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentAuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentAuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PaymentAuditLogService = PaymentAuditLogService_1 = class PaymentAuditLogService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PaymentAuditLogService_1.name);
    }
    async log(entry) {
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
            this.logger.log(`Audit log: ${entry.action} on payment ${entry.paymentId} by admin ${entry.adminId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }
    async getPaymentAuditLogs(paymentId) {
        return this.prisma.paymentVerificationAuditLog.findMany({
            where: { paymentId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPaymentLogs(paymentId) {
        return this.getPaymentAuditLogs(paymentId);
    }
    async getAdminAuditLogs(adminId, page = 1, limit = 50) {
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
    async getAdminLogs(adminId, page = 1, limit = 50) {
        return this.getAdminAuditLogs(adminId, page, limit);
    }
    async getAdminStatistics(adminId, startDate, endDate) {
        const where = { adminId };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [totalActions, approvals, rejections] = await Promise.all([
            this.prisma.paymentVerificationAuditLog.count({ where }),
            this.prisma.paymentVerificationAuditLog.count({ where: { ...where, action: 'APPROVED' } }),
            this.prisma.paymentVerificationAuditLog.count({ where: { ...where, action: 'REJECTED' } }),
        ]);
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
    async getAllAdminsStatistics(startDate, endDate) {
        const admins = await this.prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true },
        });
        const statistics = await Promise.all(admins.map(async (admin) => {
            const stats = await this.getAdminStatistics(admin.id, startDate, endDate);
            return {
                adminId: admin.id,
                adminName: admin.name,
                adminEmail: admin.email,
                ...stats,
            };
        }));
        return statistics.sort((a, b) => b.totalActions - a.totalActions);
    }
    async getAdminPerformance(startDate, endDate) {
        return this.getAllAdminsStatistics(startDate, endDate);
    }
};
exports.PaymentAuditLogService = PaymentAuditLogService;
exports.PaymentAuditLogService = PaymentAuditLogService = PaymentAuditLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentAuditLogService);
//# sourceMappingURL=payment-audit-log.service.js.map