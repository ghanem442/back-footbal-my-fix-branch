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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const wallet_service_1 = require("./wallet.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const dto_1 = require("./dto");
const client_1 = require("@prisma/client");
let WalletController = class WalletController {
    constructor(walletService) {
        this.walletService = walletService;
    }
    async getWallet(req) {
        const userId = req.user.userId;
        const wallet = await this.walletService.getWalletByUserId(userId);
        return {
            success: true,
            data: {
                id: wallet.id,
                balance: wallet.balance.toString(),
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            },
        };
    }
    async getTransactions(req, query) {
        const userId = req.user.userId;
        const options = {
            page: query.page,
            limit: query.limit,
            type: query.type,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        };
        const result = await this.walletService.getTransactions(userId, options);
        return {
            success: true,
            data: {
                transactions: result.transactions.map((t) => ({
                    id: t.id,
                    type: t.type,
                    amount: t.amount.toString(),
                    balanceBefore: t.balanceBefore.toString(),
                    balanceAfter: t.balanceAfter.toString(),
                    reference: t.reference,
                    description: t.description,
                    createdAt: t.createdAt,
                })),
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            },
        };
    }
    async withdraw(req, withdrawDto) {
        const userId = req.user.userId;
        const transaction = await this.walletService.withdraw(userId, withdrawDto.amount, withdrawDto.paymentMethod, withdrawDto.accountDetails);
        return {
            success: true,
            data: {
                transactionId: transaction.id,
                amount: transaction.amount.toString(),
                balanceBefore: transaction.balanceBefore.toString(),
                balanceAfter: transaction.balanceAfter.toString(),
                description: transaction.description,
                createdAt: transaction.createdAt,
            },
            message: {
                en: 'Withdrawal processed successfully',
                ar: 'تمت معالجة السحب بنجاح',
            },
        };
    }
    async requestWithdrawal(req, body) {
        const request = await this.walletService.createWithdrawalRequest(req.user.userId, body.amount, body.paymentMethod, body.accountDetails);
        return {
            success: true,
            data: request,
            message: {
                en: 'Withdrawal request submitted. Pending admin approval.',
                ar: 'تم تقديم طلب السحب. في انتظار موافقة المسؤول.',
            },
        };
    }
    async getWithdrawalRequests(req, page, limit) {
        const result = await this.walletService.getWithdrawalRequests(req.user.userId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 10);
        return {
            success: true,
            data: result,
            message: { en: 'Withdrawal requests retrieved', ar: 'تم استرجاع طلبات السحب' },
        };
    }
    async processWithdrawal(req, dto) {
        const userId = req.user.userId;
        const recipientDetails = {};
        if (dto.bankDetails) {
            recipientDetails.bankAccountNumber = dto.bankDetails.bankAccountNumber;
            recipientDetails.bankName = dto.bankDetails.bankName;
            recipientDetails.bankCode = dto.bankDetails.bankCode;
            recipientDetails.accountHolderName = dto.bankDetails.accountHolderName;
            recipientDetails.iban = dto.bankDetails.iban;
            recipientDetails.swiftCode = dto.bankDetails.swiftCode;
        }
        if (dto.mobileWalletDetails) {
            recipientDetails.phoneNumber = dto.mobileWalletDetails.phoneNumber;
            recipientDetails.walletProvider = dto.mobileWalletDetails.walletProvider;
            recipientDetails.name = dto.mobileWalletDetails.name;
        }
        const payoutMethod = dto.method;
        const metadata = {};
        if (dto.stripeConnectedAccountId) {
            metadata.stripeConnectedAccountId = dto.stripeConnectedAccountId;
        }
        const result = await this.walletService.processWithdrawal(userId, dto.amount, dto.gateway, payoutMethod, recipientDetails, metadata);
        const estimatedDays = result.estimatedArrival
            ? Math.ceil((result.estimatedArrival.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 3;
        return {
            success: true,
            data: {
                transactionId: result.transaction.id,
                payoutId: result.payoutId,
                amount: result.transaction.amount.toString(),
                balanceBefore: result.transaction.balanceBefore.toString(),
                balanceAfter: result.transaction.balanceAfter.toString(),
                status: result.status,
                estimatedArrival: result.estimatedArrival,
                gateway: dto.gateway,
                method: dto.method,
            },
            message: {
                en: `Withdrawal initiated successfully. Funds will arrive in ${estimatedDays} business days.`,
                ar: `تم بدء السحب بنجاح. ستصل الأموال خلال ${estimatedDays} أيام عمل.`,
            },
        };
    }
    async getWithdrawalStatus(gateway, payoutId) {
        const status = await this.walletService.getWithdrawalStatus(gateway, payoutId);
        return {
            success: true,
            data: {
                payoutId: status.payoutId,
                status: status.status,
                amount: status.amount.toString(),
                currency: status.currency,
                createdAt: status.createdAt,
                completedAt: status.completedAt,
                failureReason: status.failureReason,
            },
        };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get wallet balance',
        description: 'Retrieve the authenticated user\'s wallet balance and details.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Wallet retrieved successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    balance: '500.00',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-15T10:30:00Z',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Authentication required',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWallet", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.GetTransactionsQueryDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Withdraw funds (Legacy)',
        description: 'Field owners can withdraw funds from their wallet. Requires sufficient balance. Use /wallet/withdraw/process for full gateway integration.',
    }),
    (0, swagger_1.ApiBody)({ type: dto_1.WithdrawDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Withdrawal processed successfully',
        schema: {
            example: {
                success: true,
                data: {
                    transactionId: '123e4567-e89b-12d3-a456-426614174000',
                    amount: '100.00',
                    balanceBefore: '500.00',
                    balanceAfter: '400.00',
                    description: 'Withdrawal to bank account',
                    createdAt: '2024-01-15T10:30:00Z',
                },
                message: {
                    en: 'Withdrawal processed successfully',
                    ar: 'تمت معالجة السحب بنجاح',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Insufficient balance',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Only field owners can withdraw',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.WithdrawDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Post)('withdraw/request'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Request a withdrawal (Field Owner only)',
        description: 'Creates a withdrawal request that must be approved by admin before payout.',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "requestWithdrawal", null);
__decorate([
    (0, common_1.Get)('withdraw/requests'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Get withdrawal requests for current owner' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWithdrawalRequests", null);
__decorate([
    (0, common_1.Post)('withdraw/process'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Process withdrawal with payment gateway',
        description: 'Field owners can withdraw funds with full payment gateway integration. Supports multiple gateways and payment methods.',
    }),
    (0, swagger_1.ApiBody)({ type: dto_1.ProcessWithdrawalDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Withdrawal initiated successfully',
        schema: {
            example: {
                success: true,
                data: {
                    transactionId: '123e4567-e89b-12d3-a456-426614174000',
                    payoutId: 'po_1234567890',
                    amount: '100.00',
                    balanceBefore: '500.00',
                    balanceAfter: '400.00',
                    status: 'PENDING',
                    estimatedArrival: '2024-01-17T10:30:00Z',
                    gateway: 'stripe',
                    method: 'BANK_TRANSFER',
                },
                message: {
                    en: 'Withdrawal initiated successfully. Funds will arrive in 2-3 business days.',
                    ar: 'تم بدء السحب بنجاح. ستصل الأموال خلال 2-3 أيام عمل.',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Insufficient balance or invalid request',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Only field owners can withdraw',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ProcessWithdrawalDto]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "processWithdrawal", null);
__decorate([
    (0, common_1.Get)('withdraw/status/:gateway/:payoutId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Get withdrawal status',
        description: 'Check the status of a withdrawal/payout transaction.',
    }),
    (0, swagger_1.ApiParam)({ name: 'gateway', description: 'Payment gateway name', example: 'stripe' }),
    (0, swagger_1.ApiParam)({ name: 'payoutId', description: 'Payout transaction ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Withdrawal status retrieved successfully',
        schema: {
            example: {
                success: true,
                data: {
                    payoutId: 'po_1234567890',
                    status: 'SUCCESS',
                    amount: '100.00',
                    currency: 'EGP',
                    createdAt: '2024-01-15T10:30:00Z',
                    completedAt: '2024-01-17T14:20:00Z',
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('gateway')),
    __param(1, (0, common_1.Param)('payoutId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getWithdrawalStatus", null);
exports.WalletController = WalletController = __decorate([
    (0, swagger_1.ApiTags)('Wallet'),
    (0, common_1.Controller)('wallet'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map