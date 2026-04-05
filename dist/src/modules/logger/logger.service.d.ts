import { LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';
export declare class LoggerService implements NestLoggerService {
    private readonly logger;
    constructor(logger: WinstonLogger);
    log(message: string, context?: string, meta?: Record<string, any>): void;
    error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void;
    warn(message: string, context?: string, meta?: Record<string, any>): void;
    debug(message: string, context?: string, meta?: Record<string, any>): void;
    verbose(message: string, context?: string, meta?: Record<string, any>): void;
    logHttpRequest(data: {
        requestId: string;
        method: string;
        path: string;
        statusCode: number;
        duration: number;
        userId?: string;
        ip?: string;
    }): void;
    logAuthAttempt(data: {
        userId?: string;
        email?: string;
        result: 'success' | 'failure';
        reason?: string;
        ip?: string;
    }): void;
    logPaymentTransaction(data: {
        bookingId: string;
        gateway: string;
        amount: number;
        currency: string;
        status: string;
        transactionId?: string;
        userId?: string;
    }): void;
    logJobExecution(data: {
        jobId: string;
        jobType: string;
        status: 'started' | 'completed' | 'failed';
        duration?: number;
        error?: string;
        parameters?: Record<string, any>;
    }): void;
    logWebhook(data: {
        gateway: string;
        event: string;
        status: string;
        payload?: any;
    }): void;
    logPaymentStatusChange(data: {
        bookingId: string;
        gateway: string;
        oldStatus: string;
        newStatus: string;
        transactionId?: string;
    }): void;
}
