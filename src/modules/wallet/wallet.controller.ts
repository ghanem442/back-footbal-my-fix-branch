import { Controller, Get, Post, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { GetTransactionsQueryDto, WithdrawDto, ProcessWithdrawalDto } from './dto';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { PayoutMethod } from '@modules/payments/interfaces/payout-gateway.interface';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get user's wallet
   * GET /wallet
   */
  @Get()
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieve the authenticated user\'s wallet balance and details.',
  })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  async getWallet(@Req() req: Request & { user: JwtPayload }) {
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

  /**
   * Get wallet transactions with pagination and filters
   * GET /wallet/transactions
   */
  @Get('transactions')
  async getTransactions(
    @Req() req: Request & { user: JwtPayload },
    @Query() query: GetTransactionsQueryDto,
  ) {
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

  /**
   * Withdraw funds from wallet (Field Owner only)
   * POST /wallet/withdraw
   * Legacy endpoint - use /wallet/withdraw/process for full gateway integration
   */
  @Post('withdraw')
  @UseGuards(RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Withdraw funds (Legacy)',
    description: 'Field owners can withdraw funds from their wallet. Requires sufficient balance. Use /wallet/withdraw/process for full gateway integration.',
  })
  @ApiBody({ type: WithdrawDto })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only field owners can withdraw',
  })
  async withdraw(@Req() req: Request & { user: JwtPayload }, @Body() withdrawDto: WithdrawDto) {
    const userId = req.user.userId;

    const transaction = await this.walletService.withdraw(
      userId,
      withdrawDto.amount,
      withdrawDto.paymentMethod,
      withdrawDto.accountDetails,
    );

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

  /**
   * Request a withdrawal (new flow: request → admin approve/reject)
   * POST /wallet/withdraw/request
   */
  @Post('withdraw/request')
  @UseGuards(RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Request a withdrawal (Field Owner only)',
    description: 'Creates a withdrawal request that must be approved by admin before payout.',
  })
  async requestWithdrawal(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: { amount: number; paymentMethod: string; accountDetails: string },
  ) {
    const request = await this.walletService.createWithdrawalRequest(
      req.user.userId,
      body.amount,
      body.paymentMethod,
      body.accountDetails,
    );

    return {
      success: true,
      data: request,
      message: {
        en: 'Withdrawal request submitted. Pending admin approval.',
        ar: 'تم تقديم طلب السحب. في انتظار موافقة المسؤول.',
      },
    };
  }

  /**
   * Get owner's withdrawal requests
   * GET /wallet/withdraw/requests
   */
  @Get('withdraw/requests')
  @UseGuards(RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({ summary: 'Get withdrawal requests for current owner' })
  async getWithdrawalRequests(
    @Req() req: Request & { user: JwtPayload },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletService.getWithdrawalRequests(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      success: true,
      data: result,
      message: { en: 'Withdrawal requests retrieved', ar: 'تم استرجاع طلبات السحب' },
    };
  }
  @Post('withdraw/process')
  @UseGuards(RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Process withdrawal with payment gateway',
    description: 'Field owners can withdraw funds with full payment gateway integration. Supports multiple gateways and payment methods.',
  })
  @ApiBody({ type: ProcessWithdrawalDto })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid request',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only field owners can withdraw',
  })
  async processWithdrawal(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: ProcessWithdrawalDto,
  ) {
    const userId = req.user.userId;

    // Map DTO to recipient details
    const recipientDetails: any = {};

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

    // Map method enum
    const payoutMethod = dto.method as unknown as PayoutMethod;

    const metadata: any = {};
    if (dto.stripeConnectedAccountId) {
      metadata.stripeConnectedAccountId = dto.stripeConnectedAccountId;
    }

    const result = await this.walletService.processWithdrawal(
      userId,
      dto.amount,
      dto.gateway,
      payoutMethod,
      recipientDetails,
      metadata,
    );

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

  /**
   * Get withdrawal status
   * GET /wallet/withdraw/status/:gateway/:payoutId
   */
  @Get('withdraw/status/:gateway/:payoutId')
  @UseGuards(RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Get withdrawal status',
    description: 'Check the status of a withdrawal/payout transaction.',
  })
  @ApiParam({ name: 'gateway', description: 'Payment gateway name', example: 'stripe' })
  @ApiParam({ name: 'payoutId', description: 'Payout transaction ID' })
  @ApiResponse({
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
  })
  async getWithdrawalStatus(
    @Param('gateway') gateway: string,
    @Param('payoutId') payoutId: string,
  ) {
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
}
