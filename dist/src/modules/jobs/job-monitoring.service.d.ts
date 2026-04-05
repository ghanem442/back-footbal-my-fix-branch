import { PrismaService } from '../prisma/prisma.service';
export interface JobExecutionLog {
    jobName: string;
    jobType: string;
    status: 'success' | 'failure';
    startTime: Date;
    endTime: Date;
    duration: number;
    errorMessage?: string;
    errorStack?: string;
    metadata?: Record<string, any>;
}
export declare class JobMonitoringService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    logSuccess(log: Omit<JobExecutionLog, 'status'>): Promise<void>;
    logFailure(log: Omit<JobExecutionLog, 'status'>): Promise<void>;
    private triggerAlert;
    getJobStats(jobType?: string, startDate?: Date, endDate?: Date): Promise<{
        totalExecutions: number;
        successCount: number;
        failureCount: number;
        averageDuration: number;
    }>;
    getRecentFailures(limit?: number): Promise<JobExecutionLog[]>;
}
