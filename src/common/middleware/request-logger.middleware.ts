import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Logger Middleware
 * Logs all HTTP requests with method, path, status, duration
 * Uses structured JSON logging
 * Includes request ID for tracing
 * Excludes sensitive data from logs (passwords, tokens)
 * 
 * Requirements: 25.1
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'secret',
    'apiKey',
    'otp',
    'code',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Attach request ID to request object for tracing
    (req as any).requestId = requestId;

    // Log request
    this.logRequest(req, requestId);

    // Capture response
    const originalSend = res.send;
    res.send = (body: any): Response => {
      const duration = Date.now() - startTime;
      this.logResponse(req, res, duration, requestId);
      return originalSend.call(res, body);
    };

    next();
  }

  /**
   * Log incoming request
   */
  private logRequest(req: Request, requestId: string): void {
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      query: this.sanitizeObject(req.query),
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(logData));
  }

  /**
   * Log response
   */
  private logResponse(
    req: Request,
    res: Response,
    duration: number,
    requestId: string,
  ): void {
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString(),
    };

    // Use different log levels based on status code
    if (res.statusCode >= 500) {
      this.logger.error(JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      this.logger.warn(JSON.stringify(logData));
    } else {
      this.logger.log(JSON.stringify(logData));
    }
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Sanitize object to remove sensitive data
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key contains sensitive field name
      const isSensitive = this.sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase()),
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
