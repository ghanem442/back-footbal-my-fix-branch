import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { Wallet, WalletTransaction, WalletTransactionType, Prisma } from '@prisma/client';
import { PayoutService } from '@modules/payments/services/payout.service';
import { PayoutRequest, PayoutMethod, RecipientDetails } from '@modules/payments/interfaces/payout-gateway.interface';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private payoutService: PayoutService,
  ) {}

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Credit wallet (add funds)
   * Uses database transaction with row locking to prevent race conditions
   */
  async credit(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    description: string,
    reference?: string,
    metadata?: Record<string, any>,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId } });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = new Prisma.Decimal(balanceBefore.toString())
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
            amount: new Prisma.Decimal(amount),
            balanceBefore,
            balanceAfter,
            reference,
            description,
            metadata: metadata ?? Prisma.JsonNull,
          },
        });

        this.logger.log(
          `Credited ${amount} to wallet ${wallet.id} (User: ${userId}). Balance: ${balanceBefore} -> ${balanceAfter}`,
        );

        return transaction;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Debit wallet (remove funds)
   * Uses database transaction with row locking to prevent race conditions
   * Validates that balance doesn't go negative
   */
  async debit(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    description: string,
    reference?: string,
    metadata?: Record<string, any>,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId } });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = new Prisma.Decimal(balanceBefore.toString())
          .minus(amount)
          .toDecimalPlaces(2);

        if (balanceAfter.lessThan(0)) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type,
            amount: new Prisma.Decimal(amount),
            balanceBefore,
            balanceAfter,
            reference,
            description,
            metadata: metadata ?? Prisma.JsonNull,
          },
        });

        this.logger.log(
          `Debited ${amount} from wallet ${wallet.id} (User: ${userId}). Balance: ${balanceBefore} -> ${balanceAfter}`,
        );

        return transaction;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Get wallet transactions with pagination
   */
  async getTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: WalletTransactionType;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    transactions: WalletTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const wallet = await this.getWalletByUserId(userId);

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WalletTransactionWhereInput = {
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

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getWalletByUserId(userId);
    return wallet.balance.greaterThanOrEqualTo(amount);
  }

  /**
   * Process withdrawal for Field Owners
   * 
   * @deprecated Use processWithdrawal() for full gateway integration
   * This method is kept for backward compatibility but should not be used for new implementations
   */
  async withdraw(
    userId: string,
    amount: number,
    paymentMethod?: string,
    accountDetails?: string,
  ): Promise<WalletTransaction> {
    this.logger.warn(
      'Using deprecated withdraw() method. Use processWithdrawal() for full gateway integration.',
    );

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Check sufficient balance
    const hasSufficientBalance = await this.hasSufficientBalance(userId, amount);
    if (!hasSufficientBalance) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Create withdrawal transaction
    const description = `Withdrawal${paymentMethod ? ` via ${paymentMethod}` : ''}`;
    const reference = accountDetails || undefined;

    const transaction = await this.debit(
      userId,
      amount,
      WalletTransactionType.PAYOUT,
      description,
      reference,
    );

    this.logger.log(
      `Withdrawal processed for user ${userId}: ${amount} (Method: ${paymentMethod || 'N/A'})`,
    );

    return transaction;
  }

  /**
   * Process withdrawal with full payment gateway integration
   * Debits wallet and initiates actual payout via payment gateway
   */
  async processWithdrawal(
    userId: string,
    amount: number,
    gateway: string,
    method: PayoutMethod,
    recipientDetails: RecipientDetails,
    metadata?: Record<string, any>,
  ): Promise<{
    transaction: WalletTransaction;
    payoutId: string;
    status: string;
    estimatedArrival?: Date;
  }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Check sufficient balance
    const hasSufficientBalance = await this.hasSufficientBalance(userId, amount);
    if (!hasSufficientBalance) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Get user details for payout
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'FIELD_OWNER') {
      throw new BadRequestException('Only field owners can withdraw funds');
    }

    // Prepare payout request
    const payoutRequest: PayoutRequest = {
      userId,
      amount,
      currency: 'EGP', // Default currency, can be made configurable
      paymentMethod: method,
      recipientDetails,
      metadata: {
        email: user.email,
        ...metadata,
      },
    };

    try {
      // Process payout via payment gateway
      const payoutResponse = await this.payoutService.processPayout(gateway, payoutRequest);

      // Create withdrawal transaction with payout reference
      const description = `Withdrawal via ${gateway} (${method})`;
      const transaction = await this.debit(
        userId,
        amount,
        WalletTransactionType.PAYOUT,
        description,
        payoutResponse.payoutId,
      );

      this.logger.log(
        `Withdrawal processed for user ${userId}: ${amount} via ${gateway}. Payout ID: ${payoutResponse.payoutId}`,
      );

      return {
        transaction,
        payoutId: payoutResponse.payoutId,
        status: payoutResponse.status,
        estimatedArrival: payoutResponse.estimatedArrival,
      };
    } catch (error: any) {
      this.logger.error(`Withdrawal failed for user ${userId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Get withdrawal status
   */
  async getWithdrawalStatus(
    gateway: string,
    payoutId: string,
  ): Promise<{
    payoutId: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: Date;
    completedAt?: Date;
    failureReason?: string;
  }> {
    try {
      const status = await this.payoutService.getPayoutStatus(gateway, payoutId);
      return status;
    } catch (error: any) {
      this.logger.error(`Failed to get withdrawal status: ${error.message}`);
      throw new BadRequestException(`Failed to get withdrawal status: ${error.message}`);
    }
  }

  /**
   * Credit field owner wallet after commission deduction
   */
  async creditFieldOwner(
    fieldOwnerId: string,
    bookingId: string,
    totalAmount: number,
    commissionAmount: number,
  ): Promise<WalletTransaction> {
    const netAmount = totalAmount - commissionAmount;

    if (netAmount <= 0) {
      throw new BadRequestException('Net amount must be greater than zero');
    }

    const description = `Booking payment for ${bookingId} (Total: ${totalAmount}, Commission: ${commissionAmount})`;

    return this.credit(
      fieldOwnerId,
      netAmount,
      WalletTransactionType.CREDIT,
      description,
      bookingId,
      { actorRole: 'OWNER', transactionPurpose: 'OWNER_ONLINE_SHARE' },
    );
  }

  /**
   * Create a withdrawal request (request → admin approve/reject → payout)
   */
  async createWithdrawalRequest(
    ownerId: string,
    amount: number,
    paymentMethod: string,
    accountDetails: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const hasSufficientBalance = await this.hasSufficientBalance(ownerId, amount);
    if (!hasSufficientBalance) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });

    if (user?.role !== 'FIELD_OWNER') {
      throw new BadRequestException('Only field owners can request withdrawals');
    }

    // Debit wallet immediately (hold funds) inside a transaction
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: ownerId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.balance;
      const balanceAfter = new Prisma.Decimal(balanceBefore.toString())
        .minus(amount)
        .toDecimalPlaces(2);

      if (balanceAfter.lessThan(0)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.WITHDRAWAL,
          amount: new Prisma.Decimal(amount),
          balanceBefore,
          balanceAfter,
          description: `Withdrawal request - ${paymentMethod}`,
          metadata: { actorRole: 'OWNER', transactionPurpose: 'OWNER_WITHDRAWAL' },
        },
      });

      const request = await tx.withdrawalRequest.create({
        data: {
          ownerId,
          amount: new Prisma.Decimal(amount),
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Admin approves withdrawal request → idempotent
   */
  async approveWithdrawalRequest(
    requestId: string,
    adminId: string,
    transactionRef?: string,
  ): Promise<any> {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status === 'APPROVED') return this.formatWithdrawalRequest(request);
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve request with status ${request.status}`);
    }

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', processedBy: adminId, processedAt: new Date(), transactionRef },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    this.logger.log(`Withdrawal request ${requestId} approved by admin ${adminId}`);
    return this.formatWithdrawalRequest(updated);
  }

  /**
   * Admin rejects withdrawal request → restores wallet balance atomically, idempotent
   */
  async rejectWithdrawalRequest(
    requestId: string,
    adminId: string,
    adminNote: string,
  ): Promise<any> {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status === 'REJECTED') return this.formatWithdrawalRequest(request);
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject request with status ${request.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: request.ownerId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.balance;
      const balanceAfter = new Prisma.Decimal(balanceBefore.toString())
        .plus(request.amount)
        .toDecimalPlaces(2);

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEPOSIT,
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.logger.log(`Withdrawal request ${requestId} rejected by admin ${adminId}`);
    return this.formatWithdrawalRequest(updated);
  }

  private formatWithdrawalRequest(r: any) {
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

  /**
   * Get withdrawal requests for owner
   */
  async getWithdrawalRequests(
    ownerId: string,
    page = 1,
    limit = 10,
  ): Promise<any> {
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
}
