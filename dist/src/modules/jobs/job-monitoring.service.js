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
var JobMonitoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobMonitoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let JobMonitoringService = JobMonitoringService_1 = class JobMonitoringService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(JobMonitoringService_1.name);
    }
    async logSuccess(log) {
        try {
            this.logger.log(`Job ${log.jobType}:${log.jobName} completed successfully in ${log.duration}ms`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to log job success: ${message}`);
        }
    }
    async logFailure(log) {
        try {
            this.logger.error(`Job ${log.jobType}:${log.jobName} failed after ${log.duration}ms: ${log.errorMessage}`, log.errorStack);
            await this.triggerAlert(log);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to log job failure: ${message}`);
        }
    }
    async triggerAlert(log) {
        const criticalJobs = ['timeout', 'no-show', 'payment-processing'];
        if (criticalJobs.includes(log.jobName)) {
            this.logger.warn(`CRITICAL JOB FAILURE: ${log.jobType}:${log.jobName} - ${log.errorMessage}`);
            const alertData = {
                severity: 'critical',
                title: `Job Failure: ${log.jobType}:${log.jobName}`,
                message: log.errorMessage,
                timestamp: log.endTime,
                duration: log.duration,
                metadata: log.metadata,
                stack: log.errorStack,
            };
            this.logger.error(JSON.stringify(alertData), 'CRITICAL_JOB_FAILURE');
        }
    }
    async getJobStats(jobType, startDate, endDate) {
        return {
            totalExecutions: 0,
            successCount: 0,
            failureCount: 0,
            averageDuration: 0,
        };
    }
    async getRecentFailures(limit = 10) {
        return [];
    }
};
exports.JobMonitoringService = JobMonitoringService;
exports.JobMonitoringService = JobMonitoringService = JobMonitoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobMonitoringService);
//# sourceMappingURL=job-monitoring.service.js.map