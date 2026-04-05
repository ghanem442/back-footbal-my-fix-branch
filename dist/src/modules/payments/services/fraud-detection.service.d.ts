import { PrismaService } from '@modules/prisma/prisma.service';
export interface FraudCheckResult {
    isSuspicious: boolean;
    riskScore: number;
    flags: string[];
    shouldAutoFlag: boolean;
}
export declare class FraudDetectionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    analyzeFraudRisk(paymentId: string, userId: string): Promise<FraudCheckResult>;
    flagPayment(paymentId: string, reason: string, metadata?: any): Promise<void>;
    unflagPayment(paymentId: string): Promise<void>;
    getFraudStatistics(startDate?: Date, endDate?: Date): Promise<{
        totalPayments: number;
        flaggedPayments: number;
        rejectedPayments: number;
        flagRate: number;
        rejectionRate: number;
    }>;
}
