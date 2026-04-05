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
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const payout_service_1 = require("../payments/services/payout.service");
let WalletService = WalletService_1 = class WalletService {
    constructor(prisma, payoutService) {
        this.prisma = prisma;
        this.payoutService = payoutService;
        this.logger = new common_1.Logger(WalletService_1.name);
    }
    async getWalletByUserId(userId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        return wallet;
    }
    async credit(userId, amount, type, description, reference, metadata) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                throw new common_1.NotFoundException('Wallet not found');
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                .plus(amount)
                .toDecimalPlaces(2);
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: balanceAfter },
            });
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type,
                    amount: new client_1.Prisma.Decimal(amount),
                    balanceBefore,
                    balanceAfter,
                    reference,
                    description,
                    metadata: metadata ?? client_1.Prisma.JsonNull,
                },
            });
            this.logger.log(`Credited ${amount} to wallet ${wallet.id} (User: ${userId}). Balance: ${balanceBefore} -> ${balanceAfter}`);
            return transaction;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async debit(userId, amount, type, description, reference, metadata) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                throw new common_1.NotFoundException('Wallet not found');
            }
            const balanceBefore = wallet.balance;
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                .minus(amount)
                .toDecimalPlaces(2);
            if (balanceAfter.lessThan(0)) {
                throw new common_1.BadRequestException('Insufficient wallet balance');
            }
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: balanceAfter },
            });
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type,
                    amount: new client_1.Prisma.Decimal(amount),
                    balanceBefore,
                    balanceAfter,
                    reference,
                    description,
                    metadata: metadata ?? client_1.Prisma.JsonNull,
                },
            });
            this.logger.log(`Debited ${amount} from wallet ${wallet.id} (User: ${userId}). Balance: ${balanceBefore} -> ${balanceAfter}`);
            return transaction;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async getTransactions(userId, options = {}) {
        const wallet = await this.getWalletByUserId(userId);
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            walletId: wallet.id,
        };
        if (options.type) {
            where.type = options.type;
        }
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                where.createdAt.gte = options.startDate;
            }
            if (options.endDate) {
                where.createdAt.lte = options.endDate;
            }
        }
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.walletTransaction.count({ where }),
        ]);
        return {
            transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async hasSufficientBalance(userId, amount) {
        const wallet = await this.getWalletByUserId(userId);
        return wallet.balance.greaterThanOrEqualTo(amount);
    }
    async withdraw(userId, amount, paymentMethod, accountDetails) {
        this.logger.warn('Using deprecated withdraw() method. Use processWithdrawal() for full gateway integration.');
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        const hasSufficientBalance = await this.hasSufficientBalance(userId, amount);
        if (!hasSufficientBalance) {
            throw new common_1.BadRequestException('Insufficient wallet balance');
        }
        const description = `Withdrawal${paymentMethod ? ` via ${paymentMethod}` : ''}`;
        const reference = accountDetails || undefined;
        const transaction = await this.debit(userId, amount, client_1.WalletTransactionType.PAYOUT, description, reference);
        this.logger.log(`Withdrawal processed for user ${userId}: ${amount} (Method: ${paymentMethod || 'N/A'})`);
        return transaction;
    }
    async processWithdrawal(userId, amount, gateway, method, recipientDetails, metadata) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        const hasSufficientBalance = await this.hasSufficientBalance(userId, amount);
        if (!hasSufficientBalance) {
            throw new common_1.BadRequestException('Insufficient wallet balance');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, role: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== 'FIELD_OWNER') {
            throw new common_1.BadRequestException('Only field owners can withdraw funds');
        }
        const payoutRequest = {
            userId,
            amount,
            currency: 'EGP',
            paymentMethod: method,
            recipientDetails,
            metadata: {
                email: user.email,
                ...metadata,
            },
        };
        try {
            const payoutResponse = await this.payoutService.processPayout(gateway, payoutRequest);
            const description = `Withdrawal via ${gateway} (${method})`;
            const transaction = await this.debit(userId, amount, client_1.WalletTransactionType.PAYOUT, description, payoutResponse.payoutId);
            this.logger.log(`Withdrawal processed for user ${userId}: ${amount} via ${gateway}. Payout ID: ${payoutResponse.payoutId}`);
            return {
                transaction,
                payoutId: payoutResponse.payoutId,
                status: payoutResponse.status,
                estimatedArrival: payoutResponse.estimatedArrival,
            };
        }
        catch (error) {
            this.logger.error(`Withdrawal failed for user ${userId}: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Withdrawal failed: ${error.message}`);
        }
    }
    async getWithdrawalStatus(gateway, payoutId) {
        try {
            const status = await this.payoutService.getPayoutStatus(gateway, payoutId);
            return status;
        }
        catch (error) {
            this.logger.error(`Failed to get withdrawal status: ${error.message}`);
            throw new common_1.BadRequestException(`Failed to get withdrawal status: ${error.message}`);
        }
    }
    async creditFieldOwner(fieldOwnerId, bookingId, totalAmount, commissionAmount) {
        const netAmount = totalAmount - commissionAmount;
        if (netAmount <= 0) {
            throw new common_1.BadRequestException('Net amount must be greater than zero');
        }
        const description = `Booking payment for ${bookingId} (Total: ${totalAmount}, Commission: ${commissionAmount})`;
        return this.credit(fieldOwnerId, netAmount, client_1.WalletTransactionType.CREDIT, description, bookingId, { actorRole: 'OWNER', transactionPurpose: 'OWNER_ONLINE_SHARE' });
    }
    async createWithdrawalRequest(ownerId, amount, paymentMethod, accountDetails) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than zero');
        }
        const hasSufficientBalance = await this.hasSufficientBalance(ownerId, amount);
        if (!hasSufficientBalance) {
            throw new common_1.BadRequestException('Insufficient wallet balance');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: ownerId },
            select: { role: true },
        });
        if (user?.role !== 'FIELD_OWNER') {
            throw new common_1.BadRequestException('Only field owners can request withdrawals');
        }
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId: ownerId } });
            if (!wallet)
                throw new common_1.NotFoundException('Wallet not found');
            const balanceBefore = wallet.balance;
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                .minus(amount)
                .toDecimalPlaces(2);
            if (balanceAfter.lessThan(0)) {
                throw new common_1.BadRequestException('Insufficient wallet balance');
            }
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
            const walletTx = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: client_1.WalletTransactionType.WITHDRAWAL,
                    amount: new client_1.Prisma.Decimal(amount),
                    balanceBefore,
                    balanceAfter,
                    description: `Withdrawal request - ${paymentMethod}`,
                    metadata: { actorRole: 'OWNER', transactionPurpose: 'OWNER_WITHDRAWAL' },
                },
            });
            const request = await tx.withdrawalRequest.create({
                data: {
                    ownerId,
                    amount: new client_1.Prisma.Decimal(amount),
                    paymentMethod,
                    accountDetails,
                    walletTxId: walletTx.id,
                },
            });
            this.logger.log(`Withdrawal request created: ${request.id} for owner ${ownerId}, amount: ${amount}`);
            return {
                id: request.id,
                amount: parseFloat(request.amount.toString()),
                status: request.status,
                paymentMethod: request.paymentMethod,
                accountDetails: request.accountDetails,
                balanceBefore: parseFloat(balanceBefore.toString()),
                balanceAfter: parseFloat(balanceAfter.toString()),
                payoutId: null,
                rejectionReason: null,
                processedAt: null,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt,
            };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async approveWithdrawalRequest(requestId, adminId, transactionRef) {
        const request = await this.prisma.withdrawalRequest.findUnique({
            where: { id: requestId },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('Withdrawal request not found');
        if (request.status === 'APPROVED')
            return this.formatWithdrawalRequest(request);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot approve request with status ${request.status}`);
        }
        const updated = await this.prisma.withdrawalRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', processedBy: adminId, processedAt: new Date(), transactionRef },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        this.logger.log(`Withdrawal request ${requestId} approved by admin ${adminId}`);
        return this.formatWithdrawalRequest(updated);
    }
    async rejectWithdrawalRequest(requestId, adminId, adminNote) {
        const request = await this.prisma.withdrawalRequest.findUnique({
            where: { id: requestId },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });
        if (!request)
            throw new common_1.NotFoundException('Withdrawal request not found');
        if (request.status === 'REJECTED')
            return this.formatWithdrawalRequest(request);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot reject request with status ${request.status}`);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId: request.ownerId } });
            if (!wallet)
                throw new common_1.NotFoundException('Wallet not found');
            const balanceBefore = wallet.balance;
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                .plus(request.amount)
                .toDecimalPlaces(2);
            await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: client_1.WalletTransactionType.DEPOSIT,
                    amount: request.amount,
                    balanceBefore,
                    balanceAfter,
                    reference: requestId,
                    description: `Withdrawal request rejected - balance restored`,
                    metadata: { actorRole: 'OWNER', transactionPurpose: 'OWNER_WITHDRAWAL_REVERSAL' },
                },
            });
            return tx.withdrawalRequest.update({
                where: { id: requestId },
                data: { status: 'REJECTED', processedBy: adminId, processedAt: new Date(), adminNote },
                include: { owner: { select: { id: true, name: true, email: true } } },
            });
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
        this.logger.log(`Withdrawal request ${requestId} rejected by admin ${adminId}`);
        return this.formatWithdrawalRequest(updated);
    }
    formatWithdrawalRequest(r) {
        return {
            id: r.id,
            amount: parseFloat(r.amount.toString()),
            status: r.status,
            paymentMethod: r.paymentMethod,
            accountDetails: r.accountDetails,
            payoutId: r.transactionRef ?? null,
            rejectionReason: r.adminNote ?? null,
            processedAt: r.processedAt ?? null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            ...(r.owner ? { owner: r.owner } : {}),
        };
    }
    async getWithdrawalRequests(ownerId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [requests, total] = await Promise.all([
            this.prisma.withdrawalRequest.findMany({
                where: { ownerId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.withdrawalRequest.count({ where: { ownerId } }),
        ]);
        return {
            requests: requests.map((r) => this.formatWithdrawalRequest(r)),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payout_service_1.PayoutService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map