import { PrismaService } from '../prisma/prisma.service';
export interface CancellationPolicy {
    thresholdMaxH: number;
    thresholdMinH: number;
    refundMaxPercent: number;
    refundMinPercent: number;
    refund0Percent: number;
}
export interface RefundCalculation {
    refundPercentage: number;
    refundAmount: number;
    hoursUntilBooking: number;
    appliedThreshold: string;
}
export declare class CancellationPolicyService {
    private readonly prisma;
    private readonly logger;
    private readonly DEFAULT_POLICY;
    private readonly POLICY_KEYS;
    constructor(prisma: PrismaService);
    loadPolicy(): Promise<CancellationPolicy>;
    calculateRefund(bookingAmount: number, scheduledDateTime: Date, cancellationTime?: Date): Promise<RefundCalculation>;
    calculateFieldOwnerCancellationRefund(bookingAmount: number): RefundCalculation;
    getDefaultPolicy(): CancellationPolicy;
    getPolicyKeys(): {
        THRESHOLD_MAX_H: string;
        THRESHOLD_MIN_H: string;
        REFUND_MAX: string;
        REFUND_MIN: string;
        REFUND_0: string;
    };
}
