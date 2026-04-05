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
var CancellationPolicyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationPolicyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CancellationPolicyService = CancellationPolicyService_1 = class CancellationPolicyService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CancellationPolicyService_1.name);
        this.DEFAULT_POLICY = {
            thresholdMaxH: 3,
            thresholdMinH: 0,
            refundMaxPercent: 100,
            refundMinPercent: 0,
            refund0Percent: 0,
        };
        this.POLICY_KEYS = {
            THRESHOLD_MAX_H: 'cancellation_threshold_maxh',
            THRESHOLD_MIN_H: 'cancellation_threshold_minh',
            REFUND_MAX: 'cancellation_refund_max_percent',
            REFUND_MIN: 'cancellation_refund_min_percent',
            REFUND_0: 'cancellation_refund_0_percent',
        };
    }
    async loadPolicy() {
        try {
            const settings = await this.prisma.appSetting.findMany({
                where: {
                    key: {
                        in: Object.values(this.POLICY_KEYS),
                    },
                },
            });
            const settingsMap = new Map(settings.map((s) => [s.key, parseFloat(s.value)]));
            const policy = {
                thresholdMaxH: settingsMap.get(this.POLICY_KEYS.THRESHOLD_MAX_H) ??
                    this.DEFAULT_POLICY.thresholdMaxH,
                thresholdMinH: settingsMap.get(this.POLICY_KEYS.THRESHOLD_MIN_H) ??
                    this.DEFAULT_POLICY.thresholdMinH,
                refundMaxPercent: settingsMap.get(this.POLICY_KEYS.REFUND_MAX) ??
                    this.DEFAULT_POLICY.refundMaxPercent,
                refundMinPercent: settingsMap.get(this.POLICY_KEYS.REFUND_MIN) ??
                    this.DEFAULT_POLICY.refundMinPercent,
                refund0Percent: settingsMap.get(this.POLICY_KEYS.REFUND_0) ??
                    this.DEFAULT_POLICY.refund0Percent,
            };
            this.logger.log('Loaded cancellation policy from database', policy);
            return policy;
        }
        catch (error) {
            this.logger.warn('Failed to load cancellation policy from database, using defaults', error);
            return this.DEFAULT_POLICY;
        }
    }
    async calculateRefund(bookingAmount, scheduledDateTime, cancellationTime = new Date()) {
        const policy = await this.loadPolicy();
        const millisecondsUntilBooking = scheduledDateTime.getTime() - cancellationTime.getTime();
        const hoursUntilBooking = millisecondsUntilBooking / (1000 * 60 * 60);
        let refundPercentage;
        let appliedThreshold;
        if (hoursUntilBooking > policy.thresholdMaxH) {
            refundPercentage = policy.refundMaxPercent;
            appliedThreshold = `>${policy.thresholdMaxH}h`;
        }
        else if (hoursUntilBooking > policy.thresholdMinH) {
            refundPercentage = policy.refundMinPercent;
            appliedThreshold = `${policy.thresholdMinH}h-${policy.thresholdMaxH}h`;
        }
        else {
            refundPercentage = policy.refund0Percent;
            appliedThreshold = `<${policy.thresholdMinH}h`;
        }
        const refundAmount = (bookingAmount * refundPercentage) / 100;
        const result = {
            refundPercentage,
            refundAmount: Math.round(refundAmount * 100) / 100,
            hoursUntilBooking: Math.round(hoursUntilBooking * 100) / 100,
            appliedThreshold,
        };
        this.logger.log(`Refund calculation: ${hoursUntilBooking.toFixed(2)}h until booking, ${refundPercentage}% refund = ${result.refundAmount}`);
        return result;
    }
    calculateFieldOwnerCancellationRefund(bookingAmount) {
        const refundAmount = bookingAmount;
        this.logger.log(`Field owner cancellation: 100% refund = ${refundAmount}`);
        return {
            refundPercentage: 100,
            refundAmount: Math.round(refundAmount * 100) / 100,
            hoursUntilBooking: 0,
            appliedThreshold: 'field_owner_cancellation',
        };
    }
    getDefaultPolicy() {
        return { ...this.DEFAULT_POLICY };
    }
    getPolicyKeys() {
        return { ...this.POLICY_KEYS };
    }
};
exports.CancellationPolicyService = CancellationPolicyService;
exports.CancellationPolicyService = CancellationPolicyService = CancellationPolicyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CancellationPolicyService);
//# sourceMappingURL=cancellation-policy.service.js.map