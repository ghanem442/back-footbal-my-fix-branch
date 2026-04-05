import { Injectable, Inject, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

/**
 * Logger Service
 * Wrapper around Winston logger
 * Provides structured logging methods
 * Supports context-based logging
 * 
 * Requirements: 25.5, 25.6
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  /**
   * Log informational message
   */
  log(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.info(message, { context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, any>): void {
    this.logger.error(message, { context, trace, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { context, ...meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { context, ...meta });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, { context, ...meta });
  }

  /**
   * Log HTTP request
   * Requirements: 25.1
   */
  logHttpRequest(data: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    userId?: string;
    ip?: string;
  }): void {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      ...data,
    });
  }

  /**
   * Log authentication attempt
   * Requirements: 25.2
   */
  logAuthAttempt(data: {
    userId?: string;
    email?: string;
    result: 'success' | 'failure';
    reason?: string;
    ip?: string;
  }): void {
    const level = data.result === 'success' ? 'info' : 'warn';
    this.logger.log(level, 'Authentication Attempt', {
      context: 'Auth',
      ...data,
    });
  }

  /**
   * Log payment transaction
   * Requirements: 25.3
   */
  logPaymentTransaction(data: {
    bookingId: string;
    gateway: string;
    amount: number;
    currency: string;
    status: string;
    transactionId?: string;
    userId?: string;
  }): void {
    this.logger.info('Payment Transaction', {
      context: 'Payment',
      ...data,
    });
  }

  /**
   * Log background job execution
   * Requirements: 25.4
   */
  logJobExecution(data: {
    jobId: string;
    jobType: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    error?: string;
    parameters?: Record<string, any>;
  }): void {
    const level = data.status === 'failed' ? 'error' : 'info';
    this.logger.log(level, 'Background Job', {
      context: 'Jobs',
      ...data,
    });
  }

  /**
   * Log webhook reception
   */
  logWebhook(data: {
    gateway: string;
    event: string;
    status: string;
    payload?: any;
  }): void {
    this.logger.info('Webhook Received', {
      context: 'Webhook',
      ...data,
    });
  }

  /**
   * Log payment status change
   */
  logPaymentStatusChange(data: {
    bookingId: string;
    gateway: string;
    oldStatus: string;
    newStatus: string;
    transactionId?: string;
  }): void {
    this.logger.info('Payment Status Changed', {
      context: 'Payment',
      ...data,
    });
  }
}
