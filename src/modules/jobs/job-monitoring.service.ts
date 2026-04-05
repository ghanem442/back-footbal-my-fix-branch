import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Service for monitoring and logging background job executions
 * Provides centralized logging and error tracking for all jobs
 */
@Injectable()
export class JobMonitoringService {
  private readonly logger = new Logger(JobMonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a successful job execution
   */
  async logSuccess(log: Omit<JobExecutionLog, 'status'>): Promise<void> {
    try {
      this.logger.log(
        `Job ${log.jobType}:${log.jobName} completed successfully in ${log.duration}ms`,
      );

      // Store in database for analytics (optional)
      // await this.prisma.jobExecutionLog.create({
      //   data: {
      //     ...log,
      //     status: 'success',
      //   },
      // });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to log job success: ${message}`);
    }
  }

  /**
   * Log a failed job execution
   */
  async logFailure(log: Omit<JobExecutionLog, 'status'>): Promise<void> {
    try {
      this.logger.error(
        `Job ${log.jobType}:${log.jobName} failed after ${log.duration}ms: ${log.errorMessage}`,
        log.errorStack,
      );

      // Store in database for analytics (optional)
      // await this.prisma.jobExecutionLog.create({
      //   data: {
      //     ...log,
      //     status: 'failure',
      //   },
      // });

      // Trigger alerting if needed
      await this.triggerAlert(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to log job failure: ${message}`);
    }
  }

  /**
   * Trigger alert for critical job failures
   * Integrates with logging and can be extended with external alerting services
   */
  private async triggerAlert(log: Omit<JobExecutionLog, 'status'>): Promise<void> {
    // Check if this is a critical job that requires immediate attention
    const criticalJobs = ['timeout', 'no-show', 'payment-processing'];
    
    if (criticalJobs.includes(log.jobName)) {
      this.logger.warn(
        `CRITICAL JOB FAILURE: ${log.jobType}:${log.jobName} - ${log.errorMessage}`,
      );

      // Log critical failure with structured data for monitoring systems
      const alertData = {
        severity: 'critical',
        title: `Job Failure: ${log.jobType}:${log.jobName}`,
        message: log.errorMessage,
        timestamp: log.endTime,
        duration: log.duration,
        metadata: log.metadata,
        stack: log.errorStack,
      };

      // Log to console in structured format for log aggregation tools
      this.logger.error(
        JSON.stringify(alertData),
        'CRITICAL_JOB_FAILURE',
      );

      // Future integration points:
      // - Send to Slack webhook
      // - Send to PagerDuty
      // - Send to email distribution list
      // - Send to monitoring dashboard
      // Example:
      // if (process.env.SLACK_WEBHOOK_URL) {
      //   await axios.post(process.env.SLACK_WEBHOOK_URL, {
      //     text: `🚨 ${alertData.title}\n${alertData.message}`,
      //   });
      // }
    }
  }

  /**
   * Get job execution statistics
   */
  async getJobStats(
    jobType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
  }> {
    // This would query the job execution logs from the database
    // For now, return mock data
    return {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
    };
  }

  /**
   * Get recent job failures for monitoring dashboard
   */
  async getRecentFailures(limit: number = 10): Promise<JobExecutionLog[]> {
    // This would query the job execution logs from the database
    // For now, return empty array
    return [];
  }
}
