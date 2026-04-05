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
var FraudDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let FraudDetectionService = FraudDetectionService_1 = class FraudDetectionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(FraudDetectionService_1.name);
    }
    async analyzeFraudRisk(paymentId, userId) {
        const flags = [];
        let riskScore = 0;
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: {
                    include: {
                        player: true,
                    },
                },
            },
        });
        if (!payment) {
            return { isSuspicious: false, riskScore: 0, flags: [], shouldAutoFlag: false };
        }
        if (payment.uploadAttempts >= 3) {
            flags.push('MULTIPLE_UPLOAD_ATTEMPTS');
            riskScore += 30;
        }
        const recentUploads = await this.prisma.payment.count({
            where: {
                booking: { playerId: userId },
                lastUploadAt: {
                    gte: new Date(Date.now() - 10 * 60 * 1000),
                },
                id: { not: paymentId },
            },
        });
        if (recentUploads >= 3) {
            flags.push('RAPID_MULTIPLE_UPLOADS');
            riskScore += 25;
        }
        const similarPayments = await this.prisma.payment.count({
            where: {
                amount: payment.amount,
                gateway: payment.gateway,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 60 * 1000),
                },
                booking: {
                    playerId: { not: userId },
                },
            },
        });
        if (similarPayments >= 3) {
            flags.push('SIMILAR_AMOUNT_TIMING');
            riskScore += 20;
        }
        const rejectedCount = await this.prisma.payment.count({
            where: {
                booking: { playerId: userId },
                verificationStatus: 'REJECTED',
            },
        });
        if (rejectedCount >= 2) {
            flags.push('PREVIOUS_REJECTIONS');
            riskScore += 15;
        }
        const userAge = Date.now() - payment.booking.player.createdAt.getTime();
        const hoursOld = userAge / (1000 * 60 * 60);
        if (hoursOld < 24) {
            flags.push('NEW_USER_ACCOUNT');
            riskScore += 10;
        }
        if (payment.paymentExpiresAt) {
            const timeUntilExpiry = payment.paymentExpiresAt.getTime() - Date.now();
            const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);
            if (minutesUntilExpiry < 5 && minutesUntilExpiry > 0) {
                flags.push('NEAR_EXPIRY_UPLOAD');
                riskScore += 5;
            }
        }
        const isSuspicious = riskScore >= 50;
        const shouldAutoFlag = riskScore >= 70;
        if (isSuspicious) {
            this.logger.warn(`Suspicious payment detected: ${paymentId}, Risk Score: ${riskScore}, Flags: ${flags.join(', ')}`);
        }
        return {
            isSuspicious,
            riskScore,
            flags,
            shouldAutoFlag,
        };
    }
    async flagPayment(paymentId, reason, metadata) {
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                isFlagged: true,
                flagReason: reason,
                gatewayResponse: metadata ? { ...metadata, flaggedAt: new Date() } : undefined,
            },
        });
        this.logger.log(`Payment ${paymentId} flagged: ${reason}`);
    }
    async unflagPayment(paymentId) {
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                isFlagged: false,
                flagReason: null,
            },
        });
        this.logger.log(`Payment ${paymentId} unflagged`);
    }
    async getFraudStatistics(startDate, endDate) {
        const where = {
            gateway: { in: ['VODAFONE_CASH', 'INSTAPAY'] },
        };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [totalPayments, flaggedPayments, rejectedPayments] = await Promise.all([
            this.prisma.payment.count({ where }),
            this.prisma.payment.count({ where: { ...where, isFlagged: true } }),
            this.prisma.payment.count({ where: { ...where, verificationStatus: 'REJECTED' } }),
        ]);
        return {
            totalPayments,
            flaggedPayments,
            rejectedPayments,
            flagRate: totalPayments > 0 ? Math.round((flaggedPayments / totalPayments) * 100) : 0,
            rejectionRate: totalPayments > 0 ? Math.round((rejectedPayments / totalPayments) * 100) : 0,
        };
    }
};
exports.FraudDetectionService = FraudDetectionService;
exports.FraudDetectionService = FraudDetectionService = FraudDetectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FraudDetectionService);
//# sourceMappingURL=fraud-detection.service.js.map