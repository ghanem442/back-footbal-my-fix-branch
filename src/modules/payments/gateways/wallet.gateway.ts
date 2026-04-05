import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
  WebhookResult,
  RefundResponse,
} from '../interfaces/payment-gateway.interface';
import { WalletService } from '@modules/wallet/wallet.service';
import { WalletTransactionType } from '@prisma/client';

/**
 * Wallet Payment Gateway
 * Processes payments using user's wallet balance
 */
@Injectable()
export class WalletGateway implements PaymentGateway {
  private readonly logger = new Logger(WalletGateway.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * Process payment using wallet balance
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Check if booking already has a successful payment (prevent double-spending)
      const existingPayment = await this.walletService['prisma'].payment.findUnique({
        where: { bookingId: request.bookingId },
      });

      if (existingPayment && existingPayment.status === 'COMPLETED') {
        this.logger.warn(
          `Attempted double payment for booking ${request.bookingId}`,
        );
        return {
          transactionId: existingPayment.transactionId || '',
          status: 'FAILED',
          gatewayResponse: {
            error: 'Booking already paid',
          },
        };
      }

      // Get wallet to check balance
      const wallet = await this.walletService.getWalletByUserId(request.userId);
      const currentBalance = Number(wallet.balance);
      const requiredAmount = request.amount;

      console.log('💰 === WALLET BALANCE CHECK ===');
      console.log('User ID:', request.userId);
      console.log('Current Balance:', currentBalance, 'EGP');
      console.log('Required Amount:', requiredAmount, 'EGP');
      console.log('Sufficient?', currentBalance >= requiredAmount ? '✅ YES' : '❌ NO');
      console.log('Difference:', (currentBalance - requiredAmount).toFixed(2), 'EGP');
      console.log('===============================');

      // Check if user has sufficient balance
      const hasSufficientBalance = await this.walletService.hasSufficientBalance(
        request.userId,
        request.amount,
      );

      if (!hasSufficientBalance) {
        console.log('❌ PAYMENT FAILED: Insufficient wallet balance');
        console.log('   Balance:', currentBalance, 'EGP');
        console.log('   Required:', requiredAmount, 'EGP');
        console.log('   Shortage:', (requiredAmount - currentBalance).toFixed(2), 'EGP');
        
        return {
          transactionId: '',
          status: 'FAILED',
          gatewayResponse: {
            error: 'Insufficient wallet balance',
            currentBalance: currentBalance,
            requiredAmount: requiredAmount,
            shortage: requiredAmount - currentBalance,
          },
        };
      }

      console.log('✅ Balance check passed - proceeding with debit');

      // Debit wallet
      const transaction = await this.walletService.debit(
        request.userId,
        request.amount,
        WalletTransactionType.BOOKING_PAYMENT,
        `Payment for booking ${request.bookingId}`,
        request.bookingId,
      );

      this.logger.log(
        `Wallet payment processed: ${request.amount} ${request.currency} for booking ${request.bookingId}`,
      );

      return {
        transactionId: transaction.id,
        status: 'SUCCESS',
        gatewayResponse: {
          walletTransactionId: transaction.id,
          balanceBefore: transaction.balanceBefore.toString(),
          balanceAfter: transaction.balanceAfter.toString(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Wallet payment failed for booking ${request.bookingId}: ${errorMessage}`,
      );

      return {
        transactionId: '',
        status: 'FAILED',
        gatewayResponse: {
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Wallet payments don't use webhooks
   */
  async handleWebhook(_payload: any, _signature?: string): Promise<WebhookResult> {
    throw new BadRequestException('Wallet gateway does not support webhooks');
  }

  /**
   * Refund a wallet payment by crediting the wallet
   */
  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    try {
      // Get the original transaction to find the user
      const originalTransaction = await this.walletService['prisma'].walletTransaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true },
      });

      if (!originalTransaction) {
        throw new BadRequestException('Original transaction not found');
      }

      // Credit the wallet
      const refundTransaction = await this.walletService.credit(
        originalTransaction.wallet.userId,
        amount,
        WalletTransactionType.REFUND,
        `Refund for transaction ${transactionId}`,
        transactionId,
      );

      this.logger.log(
        `Wallet refund processed: ${amount} for transaction ${transactionId}`,
      );

      return {
        refundId: refundTransaction.id,
        status: 'SUCCESS',
        amount,
        gatewayResponse: {
          walletTransactionId: refundTransaction.id,
          balanceBefore: refundTransaction.balanceBefore.toString(),
          balanceAfter: refundTransaction.balanceAfter.toString(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Wallet refund failed for transaction ${transactionId}: ${errorMessage}`,
      );

      return {
        refundId: '',
        status: 'FAILED',
        amount,
        gatewayResponse: {
          error: errorMessage,
        },
      };
    }
  }
}
