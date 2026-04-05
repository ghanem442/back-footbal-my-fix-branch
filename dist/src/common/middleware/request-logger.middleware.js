"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggerMiddleware = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let RequestLoggerMiddleware = class RequestLoggerMiddleware {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
        this.sensitiveFields = [
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
    }
    use(req, res, next) {
        const requestId = (0, uuid_1.v4)();
        const startTime = Date.now();
        req.requestId = requestId;
        this.logRequest(req, requestId);
        const originalSend = res.send;
        res.send = (body) => {
            const duration = Date.now() - startTime;
            this.logResponse(req, res, duration, requestId);
            return originalSend.call(res, body);
        };
        next();
    }
    logRequest(req, requestId) {
        const logData = {
            requestId,
            method: req.method,
            path: req.path,
            query: this.sanitizeObject(req.query),
            ip: this.getClientIp(req),
            userAgent: req.headers['user-agent'],
            userId: req.user?.userId,
            timestamp: new Date().toISOString(),
        };
        this.logger.log(JSON.stringify(logData));
    }
    logResponse(req, res, duration, requestId) {
        const logData = {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId,
            timestamp: new Date().toISOString(),
        };
        if (res.statusCode >= 500) {
            this.logger.error(JSON.stringify(logData));
        }
        else if (res.statusCode >= 400) {
            this.logger.warn(JSON.stringify(logData));
        }
        else {
            this.logger.log(JSON.stringify(logData));
        }
    }
    getClientIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        return req.ip || req.socket.remoteAddress || 'unknown';
    }
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item));
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const isSensitive = this.sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()));
            if (isSensitive) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
};
exports.RequestLoggerMiddleware = RequestLoggerMiddleware;
exports.RequestLoggerMiddleware = RequestLoggerMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestLoggerMiddleware);
//# sourceMappingURL=request-logger.middleware.js.map