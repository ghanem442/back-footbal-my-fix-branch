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
var PlatformWalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformWalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const PLATFORM_WALLET_ID = 'platform-wallet-001';
let PlatformWalletService = PlatformWalletService_1 = class PlatformWalletService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PlatformWalletService_1.name);
    }
    async getWallet() {
        await this.prisma.$executeRaw `
      INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
      VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
        const [wallet] = await this.prisma.$queryRaw `
      SELECT id, balance, "createdAt", "updatedAt" FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID}
    `;
        return { id: wallet.id, balance: parseFloat(wallet.balance), createdAt: wallet.createdAt, updatedAt: wallet.updatedAt };
    }
    async credit(amount, type, bookingId, description, reference) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be greater than zero');
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `
        INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
        VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
            const [wallet] = await tx.$queryRaw `
        SELECT id, balance FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID} FOR UPDATE
      `;
            if (!wallet)
                throw new common_1.NotFoundException('Platform wallet not found');
            const balanceBefore = parseFloat(wallet.balance);
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore).plus(amount).toDecimalPlaces(2);
            await tx.$executeRaw `
        UPDATE "PlatformWallet" SET balance = ${balanceAfter}, "updatedAt" = NOW() WHERE id = ${PLATFORM_WALLET_ID}
      `;
            const txId = require('crypto').randomUUID();
            await tx.$executeRaw `
        INSERT INTO "PlatformWalletTransaction" (id, "platformWalletId", type, amount, "balanceBefore", "balanceAfter", "bookingId", reference, description, "createdAt")
        VALUES (${txId}, ${PLATFORM_WALLET_ID}, ${type}::"PlatformTransactionType", ${amount}, ${balanceBefore}, ${parseFloat(balanceAfter.toString())}, ${bookingId ?? null}, ${reference ?? null}, ${description ?? null}, NOW())
      `;
            this.logger.log(`Platform wallet credited ${amount} (${type}). Balance: ${balanceBefore} -> ${balanceAfter}`);
            return { id: txId, type, amount, balanceBefore, balanceAfter: parseFloat(balanceAfter.toString()) };
        });
    }
    async debit(amount, type, bookingId, description, reference, payoutMethod, payoutDetails) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be greater than zero');
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `
        INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
        VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
            const [wallet] = await tx.$queryRaw `
        SELECT id, balance FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID} FOR UPDATE
      `;
            if (!wallet)
                throw new common_1.NotFoundException('Platform wallet not found');
            const balanceBefore = parseFloat(wallet.balance);
            const balanceAfter = new client_1.Prisma.Decimal(balanceBefore).minus(amount).toDecimalPlaces(2);
            if (balanceAfter.lessThan(0))
                throw new common_1.BadRequestException('Insufficient platform wallet balance');
            await tx.$executeRaw `
        UPDATE "PlatformWallet" SET balance = ${balanceAfter}, "updatedAt" = NOW() WHERE id = ${PLATFORM_WALLET_ID}
      `;
            const txId = require('crypto').randomUUID();
            const payoutDetailsJson = payoutDetails ? JSON.stringify(payoutDetails) : null;
            await tx.$executeRaw `
        INSERT INTO "PlatformWalletTransaction"
          (id, "platformWalletId", type, amount, "balanceBefore", "balanceAfter", "bookingId", reference, description, "payoutMethod", "payoutDetails", "createdAt")
        VALUES (
          ${txId}, ${PLATFORM_WALLET_ID}, ${type}::"PlatformTransactionType",
          ${amount}, ${balanceBefore}, ${parseFloat(balanceAfter.toString())},
          ${bookingId ?? null}, ${reference ?? null}, ${description ?? null},
          ${payoutMethod ?? null}, ${payoutDetailsJson}::jsonb, NOW()
        )
      `;
            this.logger.log(`Platform wallet debited ${amount} (${type}). Balance: ${balanceBefore} -> ${balanceAfter}`);
            return {
                id: txId,
                type,
                amount,
                balanceBefore,
                balanceAfter: parseFloat(balanceAfter.toString()),
                reference: reference ?? null,
                description: description ?? null,
                payoutMethod: payoutMethod ?? null,
                payoutDetails: payoutDetails ?? null,
                createdAt: new Date(),
            };
        });
    }
    async getTransactions(page = 1, limit = 20, type, bookingId) {
        const offset = (page - 1) * limit;
        const conditions = [`"platformWalletId" = 'platform-wallet-001'`];
        if (type)
            conditions.push(`type = '${type}'::"PlatformTransactionType"`);
        if (bookingId)
            conditions.push(`"bookingId" = '${bookingId}'`);
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const transactions = await this.prisma.$queryRawUnsafe(`
      SELECT id, type::text, amount, "balanceBefore", "balanceAfter", "bookingId", reference, description, "payoutMethod", "payoutDetails", "createdAt"
      FROM "PlatformWalletTransaction"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const countResult = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM "PlatformWalletTransaction" ${whereClause}
    `);
        const total = countResult[0]?.count ?? 0;
        return {
            transactions: transactions.map(t => ({
                ...t,
                amount: parseFloat(t.amount),
                balanceBefore: parseFloat(t.balanceBefore),
                balanceAfter: parseFloat(t.balanceAfter),
                payoutMethod: t.payoutMethod ?? null,
                payoutDetails: t.payoutDetails ?? null,
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
};
exports.PlatformWalletService = PlatformWalletService;
exports.PlatformWalletService = PlatformWalletService = PlatformWalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlatformWalletService);
//# sourceMappingURL=platform-wallet.service.js.map