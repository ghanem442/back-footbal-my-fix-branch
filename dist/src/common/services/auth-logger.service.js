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
var AuthLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLoggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../modules/prisma/prisma.service");
let AuthLoggerService = AuthLoggerService_1 = class AuthLoggerService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuthLoggerService_1.name);
    }
    async logAuthAttempt(attempt) {
        const logData = {
            timestamp: new Date().toISOString(),
            email: attempt.email,
            userId: attempt.userId || 'N/A',
            ipAddress: attempt.ipAddress,
            userAgent: attempt.userAgent || 'N/A',
            success: attempt.success,
            failureReason: attempt.failureReason || 'N/A',
        };
        if (attempt.success) {
            this.logger.log(`Authentication SUCCESS - User: ${logData.email} (${logData.userId}), IP: ${logData.ipAddress}`);
        }
        else {
            this.logger.warn(`Authentication FAILURE - User: ${logData.email}, IP: ${logData.ipAddress}, Reason: ${logData.failureReason}`);
        }
        this.logger.debug(JSON.stringify(logData));
    }
    async logSuccessfulLogin(userId, email, ipAddress, userAgent) {
        await this.logAuthAttempt({
            userId,
            email,
            ipAddress,
            userAgent,
            success: true,
        });
    }
    async logFailedLogin(email, ipAddress, reason, userAgent) {
        await this.logAuthAttempt({
            email,
            ipAddress,
            userAgent,
            success: false,
            failureReason: reason,
        });
    }
};
exports.AuthLoggerService = AuthLoggerService;
exports.AuthLoggerService = AuthLoggerService = AuthLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthLoggerService);
//# sourceMappingURL=auth-logger.service.js.map