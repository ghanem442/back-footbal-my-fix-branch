import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const PLATFORM_WALLET_ID = 'platform-wallet-001';

@Injectable()
export class PlatformWalletService {
  private readonly logger = new Logger(PlatformWalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWallet() {
    await this.prisma.$executeRaw`
      INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
      VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    const [wallet] = await this.prisma.$queryRaw<any[]>`
      SELECT id, balance, "createdAt", "updatedAt" FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID}
    `;
    return { id: wallet.id, balance: parseFloat(wallet.balance), createdAt: wallet.createdAt, updatedAt: wallet.updatedAt };
  }

  async credit(amount: number, type: string, bookingId?: string, description?: string, reference?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
        VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      const [wallet] = await tx.$queryRaw<any[]>`
        SELECT id, balance FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID} FOR UPDATE
      `;
      if (!wallet) throw new NotFoundException('Platform wallet not found');

      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = new Prisma.Decimal(balanceBefore).plus(amount).toDecimalPlaces(2);

      await tx.$executeRaw`
        UPDATE "PlatformWallet" SET balance = ${balanceAfter}, "updatedAt" = NOW() WHERE id = ${PLATFORM_WALLET_ID}
      `;

      const txId = require('crypto').randomUUID();
      await tx.$executeRaw`
        INSERT INTO "PlatformWalletTransaction" (id, "platformWalletId", type, amount, "balanceBefore", "balanceAfter", "bookingId", reference, description, "createdAt")
        VALUES (${txId}, ${PLATFORM_WALLET_ID}, ${type}::"PlatformTransactionType", ${amount}, ${balanceBefore}, ${parseFloat(balanceAfter.toString())}, ${bookingId ?? null}, ${reference ?? null}, ${description ?? null}, NOW())
      `;

      this.logger.log(`Platform wallet credited ${amount} (${type}). Balance: ${balanceBefore} -> ${balanceAfter}`);
      return { id: txId, type, amount, balanceBefore, balanceAfter: parseFloat(balanceAfter.toString()) };
    });
  }

  async debit(
    amount: number,
    type: string,
    bookingId?: string,
    description?: string,
    reference?: string,
    payoutMethod?: string,
    payoutDetails?: Record<string, any>,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "PlatformWallet" (id, balance, "createdAt", "updatedAt")
        VALUES (${PLATFORM_WALLET_ID}, 0, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      const [wallet] = await tx.$queryRaw<any[]>`
        SELECT id, balance FROM "PlatformWallet" WHERE id = ${PLATFORM_WALLET_ID} FOR UPDATE
      `;
      if (!wallet) throw new NotFoundException('Platform wallet not found');

      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = new Prisma.Decimal(balanceBefore).minus(amount).toDecimalPlaces(2);

      if (balanceAfter.lessThan(0)) throw new BadRequestException('Insufficient platform wallet balance');

      await tx.$executeRaw`
        UPDATE "PlatformWallet" SET balance = ${balanceAfter}, "updatedAt" = NOW() WHERE id = ${PLATFORM_WALLET_ID}
      `;

      const txId = require('crypto').randomUUID();
      const payoutDetailsJson = payoutDetails ? JSON.stringify(payoutDetails) : null;

      await tx.$executeRaw`
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

  async getTransactions(page = 1, limit = 20, type?: string, bookingId?: string) {
    const offset = (page - 1) * limit;

    const conditions: string[] = [`"platformWalletId" = 'platform-wallet-001'`];
    if (type) conditions.push(`type = '${type}'::"PlatformTransactionType"`);
    if (bookingId) conditions.push(`"bookingId" = '${bookingId}'`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const transactions = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id, type::text, amount, "balanceBefore", "balanceAfter", "bookingId", reference, description, "payoutMethod", "payoutDetails", "createdAt"
      FROM "PlatformWalletTransaction"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`
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
}
