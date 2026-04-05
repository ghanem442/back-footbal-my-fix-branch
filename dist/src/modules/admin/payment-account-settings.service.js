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
var PaymentAccountSettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentAccountSettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PaymentAccountSettingsService = PaymentAccountSettingsService_1 = class PaymentAccountSettingsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PaymentAccountSettingsService_1.name);
    }
    async upsertPaymentAccount(dto) {
        if (dto.paymentMethod === 'VODAFONE_CASH' && !dto.accountNumber) {
            throw new common_1.BadRequestException('Account number is required for Vodafone Cash');
        }
        if (dto.paymentMethod === 'INSTAPAY' && (!dto.accountName || !dto.mobileNumber)) {
            throw new common_1.BadRequestException('Account name and mobile number are required for InstaPay');
        }
        const account = await this.prisma.paymentAccountSettings.upsert({
            where: { paymentMethod: dto.paymentMethod },
            update: {
                accountNumber: dto.accountNumber,
                accountName: dto.accountName,
                mobileNumber: dto.mobileNumber,
                ipn: dto.ipn,
                bankAccount: dto.bankAccount,
                isActive: dto.isActive ?? true,
                updatedAt: new Date(),
            },
            create: {
                paymentMethod: dto.paymentMethod,
                accountNumber: dto.accountNumber,
                accountName: dto.accountName,
                mobileNumber: dto.mobileNumber,
                ipn: dto.ipn,
                bankAccount: dto.bankAccount,
                isActive: dto.isActive ?? true,
            },
        });
        this.logger.log(`Payment account settings ${dto.paymentMethod} upserted`);
        return account;
    }
    async createAccount(dto) {
        return this.upsertPaymentAccount(dto);
    }
    async updateAccount(id, dto) {
        const existing = await this.prisma.paymentAccountSettings.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Payment account not found`);
        }
        const account = await this.prisma.paymentAccountSettings.update({
            where: { id },
            data: {
                accountNumber: dto.accountNumber ?? existing.accountNumber,
                accountName: dto.accountName ?? existing.accountName,
                mobileNumber: dto.mobileNumber ?? existing.mobileNumber,
                ipn: dto.ipn ?? existing.ipn,
                bankAccount: dto.bankAccount ?? existing.bankAccount,
                isActive: dto.isActive ?? existing.isActive,
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Payment account ${id} updated`);
        return account;
    }
    async getAllAccounts() {
        return this.getAllPaymentAccounts();
    }
    async deleteAccount(id) {
        const existing = await this.prisma.paymentAccountSettings.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Payment account not found`);
        }
        await this.prisma.paymentAccountSettings.delete({
            where: { id },
        });
        this.logger.log(`Payment account ${id} deleted`);
        return { deleted: true };
    }
    async upsertPaymentAccountOld(dto) {
        if (dto.paymentMethod === 'VODAFONE_CASH' && !dto.accountNumber) {
            throw new common_1.BadRequestException('Account number is required for Vodafone Cash');
        }
        if (dto.paymentMethod === 'INSTAPAY' && (!dto.accountName || !dto.mobileNumber)) {
            throw new common_1.BadRequestException('Account name and mobile number are required for InstaPay');
        }
        const account = await this.prisma.paymentAccountSettings.upsert({
            where: { paymentMethod: dto.paymentMethod },
            update: {
                accountNumber: dto.accountNumber,
                accountName: dto.accountName,
                mobileNumber: dto.mobileNumber,
                isActive: dto.isActive ?? true,
                updatedAt: new Date(),
            },
            create: {
                paymentMethod: dto.paymentMethod,
                accountNumber: dto.accountNumber,
                accountName: dto.accountName,
                mobileNumber: dto.mobileNumber,
                isActive: dto.isActive ?? true,
            },
        });
        this.logger.log(`Payment account settings ${dto.paymentMethod} upserted`);
        return account;
    }
    async updatePaymentAccount(paymentMethod, dto) {
        const existing = await this.prisma.paymentAccountSettings.findUnique({
            where: { paymentMethod },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Payment account settings for ${paymentMethod} not found`);
        }
        const account = await this.prisma.paymentAccountSettings.update({
            where: { paymentMethod },
            data: {
                accountNumber: dto.accountNumber ?? existing.accountNumber,
                accountName: dto.accountName ?? existing.accountName,
                mobileNumber: dto.mobileNumber ?? existing.mobileNumber,
                isActive: dto.isActive ?? existing.isActive,
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Payment account settings ${paymentMethod} updated`);
        return account;
    }
    async getAllPaymentAccounts() {
        return this.prisma.paymentAccountSettings.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPaymentAccount(paymentMethod) {
        const account = await this.prisma.paymentAccountSettings.findUnique({
            where: { paymentMethod },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Payment account settings for ${paymentMethod} not found`);
        }
        return account;
    }
    async getActivePaymentAccount(paymentMethod) {
        const account = await this.prisma.paymentAccountSettings.findFirst({
            where: {
                paymentMethod,
                isActive: true,
            },
        });
        return account;
    }
    async deletePaymentAccount(paymentMethod) {
        const existing = await this.prisma.paymentAccountSettings.findUnique({
            where: { paymentMethod },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Payment account settings for ${paymentMethod} not found`);
        }
        await this.prisma.paymentAccountSettings.delete({
            where: { paymentMethod },
        });
        this.logger.log(`Payment account settings ${paymentMethod} deleted`);
        return { deleted: true };
    }
};
exports.PaymentAccountSettingsService = PaymentAccountSettingsService;
exports.PaymentAccountSettingsService = PaymentAccountSettingsService = PaymentAccountSettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentAccountSettingsService);
//# sourceMappingURL=payment-account-settings.service.js.map