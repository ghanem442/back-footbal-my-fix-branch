import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Logger } from '@nestjs/common';
import {
  PayoutGateway,
  PayoutRequest,
  PayoutResponse,
  PayoutStatusResponse,
  PayoutMethod,
} from '../interfaces/payout-gateway.interface';

/**
 * Stripe Payout Gateway
 * 
 * Implementation of PayoutGateway interface for Stripe Connect.
 * Handles payouts to connected accounts or direct bank transfers.
 * 
 * Note: Requires Stripe Connect setup for field owners.
 */
@Injectable()
export class StripePayoutGateway implements PayoutGateway {
  private readonly stripe: Stripe | null = null;
  private readonly isConfigured: boolean = false;
  private readonly logger = new Logger(StripePayoutGateway.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (apiKey && apiKey !== 'your-stripe-secret-key') {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2026-01-28.clover',
      });
      this.isConfigured = true;
      this.logger.log('Stripe payout gateway initialized successfully');
    } else {
      this.logger.warn('Stripe credentials not configured. Stripe payouts will not be available.');
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.stripe) {
      throw new BadRequestException('Stripe payout gateway is not configured');
    }
  }

  /**
   * Process payout via Stripe
   * For Stripe Connect: Transfer to connected account
   * For direct: Create payout to external bank account
   */
  async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
    this.ensureConfigured();
    this.logger.log(`Processing payout for user ${request.userId}, amount: ${request.amount}`);

    try {
      if (request.paymentMethod === PayoutMethod.STRIPE_CONNECT) {
        return await this.processConnectPayout(request);
      } else if (request.paymentMethod === PayoutMethod.BANK_TRANSFER) {
        return await this.processBankPayout(request);
      } else {
        throw new BadRequestException('Unsupported payout method for Stripe');
      }
    } catch (error: any) {
      this.logger.error(`Payout failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Stripe payout failed: ${error.message}`);
    }
  }

  /**
   * Process payout to Stripe Connect account
   */
  private async processConnectPayout(request: PayoutRequest): Promise<PayoutResponse> {
    // Get connected account ID from metadata
    const connectedAccountId = request.metadata?.stripeConnectedAccountId;
    
    if (!connectedAccountId) {
      throw new BadRequestException('Stripe connected account ID is required');
    }

    // Create transfer to connected account
    const transfer = await this.stripe!.transfers.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      destination: connectedAccountId,
      metadata: {
        userId: request.userId,
        ...request.metadata,
      },
    });

    return {
      payoutId: transfer.id,
      status: this.mapTransferStatus(transfer),
      gatewayResponse: transfer,
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // ~2 days
      fee: 0, // Stripe Connect fees are handled separately
    };
  }

  /**
   * Process payout to external bank account
   * Note: This requires setting up external accounts in Stripe
   */
  private async processBankPayout(request: PayoutRequest): Promise<PayoutResponse> {
    // For direct bank payouts, you would typically:
    // 1. Create an external account (bank account) for the recipient
    // 2. Create a payout to that account
    
    // This is a simplified implementation
    const payout = await this.stripe!.payouts.create({
      amount: Math.round(request.amount * 100),
      currency: request.currency.toLowerCase(),
      metadata: {
        userId: request.userId,
        recipientName: request.recipientDetails.accountHolderName || '',
        ...request.metadata,
      },
    });

    return {
      payoutId: payout.id,
      status: this.mapPayoutStatus(payout.status),
      gatewayResponse: payout,
      estimatedArrival: new Date(payout.arrival_date * 1000),
      fee: payout.amount / 100,
    };
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse> {
    this.ensureConfigured();

    try {
      // Try to retrieve as payout first
      try {
        const payout = await this.stripe!.payouts.retrieve(payoutId);
        return {
          payoutId: payout.id,
          status: this.mapPayoutStatus(payout.status),
          amount: payout.amount / 100,
          currency: payout.currency.toUpperCase(),
          createdAt: new Date(payout.created * 1000),
          completedAt: payout.arrival_date ? new Date(payout.arrival_date * 1000) : undefined,
          failureReason: payout.failure_message || undefined,
        };
      } catch {
        // If not a payout, try as transfer
        const transfer = await this.stripe!.transfers.retrieve(payoutId);
        return {
          payoutId: transfer.id,
          status: this.mapTransferStatus(transfer),
          amount: transfer.amount / 100,
          currency: transfer.currency.toUpperCase(),
          createdAt: new Date(transfer.created * 1000),
          completedAt: transfer.created ? new Date(transfer.created * 1000) : undefined,
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to get payout status: ${error.message}`);
      throw new InternalServerErrorException(`Failed to get payout status: ${error.message}`);
    }
  }

  /**
   * Cancel a pending payout
   */
  async cancelPayout(payoutId: string): Promise<{ success: boolean; message: string }> {
    this.ensureConfigured();

    try {
      const payout = await this.stripe!.payouts.cancel(payoutId);
      return {
        success: payout.status === 'canceled',
        message: payout.status === 'canceled' ? 'Payout cancelled successfully' : 'Failed to cancel payout',
      };
    } catch (error: any) {
      this.logger.error(`Failed to cancel payout: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private mapPayoutStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' {
    switch (status) {
      case 'paid':
        return 'SUCCESS';
      case 'pending':
      case 'in_transit':
        return 'PENDING';
      case 'failed':
        return 'FAILED';
      case 'canceled':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  private mapTransferStatus(transfer: Stripe.Transfer): 'SUCCESS' | 'PENDING' | 'FAILED' {
    if (transfer.reversed) return 'FAILED';
    return 'SUCCESS'; // Transfers are typically instant
  }
}
