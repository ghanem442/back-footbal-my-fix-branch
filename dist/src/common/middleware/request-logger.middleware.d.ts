import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly sensitiveFields;
    use(req: Request, res: Response, next: NextFunction): void;
    private logRequest;
    private logResponse;
    private getClientIp;
    private sanitizeObject;
}
