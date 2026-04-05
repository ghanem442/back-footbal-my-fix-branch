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
export declare class PaymentAuditLogService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(entry: AuditLogEntry): Promise<void>;
    getPaymentAuditLogs(paymentId: string): Promise<{
        id: string;
        paymentId: string;
        adminId: string;
        action: string;
        previousStatus: string | null;
        newStatus: string | null;
        reason: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }[]>;
    getPaymentLogs(paymentId: string): Promise<{
        id: string;
        paymentId: string;
        adminId: string;
        action: string;
        previousStatus: string | null;
        newStatus: string | null;
        reason: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }[]>;
    getAdminAuditLogs(adminId: string, page?: number, limit?: number): Promise<{
        logs: {
            id: string;
            paymentId: string;
            adminId: string;
            action: string;
            previousStatus: string | null;
            newStatus: string | null;
            reason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAdminLogs(adminId: string, page?: number, limit?: number): Promise<{
        logs: {
            id: string;
            paymentId: string;
            adminId: string;
            action: string;
            previousStatus: string | null;
            newStatus: string | null;
            reason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAdminStatistics(adminId: string, startDate?: Date, endDate?: Date): Promise<{
        totalActions: number;
        approvals: number;
        rejections: number;
        approvalRate: number;
        rejectionRate: number;
        averageVerificationTimeMinutes: number;
    }>;
    getAllAdminsStatistics(startDate?: Date, endDate?: Date): Promise<{
        totalActions: number;
        approvals: number;
        rejections: number;
        approvalRate: number;
        rejectionRate: number;
        averageVerificationTimeMinutes: number;
        adminId: string;
        adminName: string | null;
        adminEmail: string;
    }[]>;
    getAdminPerformance(startDate?: Date, endDate?: Date): Promise<{
        totalActions: number;
        approvals: number;
        rejections: number;
        approvalRate: number;
        rejectionRate: number;
        averageVerificationTimeMinutes: number;
        adminId: string;
        adminName: string | null;
        adminEmail: string;
    }[]>;
}
