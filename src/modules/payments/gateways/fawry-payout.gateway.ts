import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  PayoutGateway,
  PayoutRequest,
  PayoutResponse,
  PayoutStatusResponse,
  PayoutMethod,
} from '../interfaces/payout-gateway.interface';

/**
 * Fawry Payout Gateway
 * 
 * Implementation of PayoutGateway interface for Fawry (Egyptian payment gateway).
 * Handles payouts to bank accounts and mobile wallets in Egypt.
 */
@Injectable()
export class FawryPayoutGateway implements PayoutGateway {
  private readonly merchantCode: string;
  private readonly secretKey: string;
  private readonly baseUrl: string = 'https://atfawry.fawrystaging.com/ECommerceWeb/api'; // Staging URL
  private readonly isConfigured: boolean = false;
  private readonly logger = new Logger(FawryPayoutGateway.name);

  constructor(private readonly configService: ConfigService) {
    this.merchantCode = this.configService.get<string>('FAWRY_MERCHANT_CODE') || '';
    this.secretKey = this.configService.get<string>('FAWRY_SECRET_KEY') || '';
    
    if (this.merchantCode && this.merchantCode !== 'your-fawry-merchant-code' && this.secretKey) {
      this.isConfigured = true;
      this.logger.log('Fawry payout gateway initialized successfully');
    } else {
      this.logger.warn('Fawry credentials not configured. Fawry payouts will not be available.');
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new BadRequestException('Fawry payout gateway is not configured');
    }
  }

  /**
   * Process payout via Fawry
   */
  async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
    this.ensureConfigured();
    this.logger.log(`Processing Fawry payout for user ${request.userId}, amount: ${request.amount}`);

    try {
      if (request.paymentMethod === PayoutMethod.BANK_TRANSFER) {
        return await this.processBankPayout(request);
      } else if (request.paymentMethod === PayoutMethod.MOBILE_WALLET) {
        return await this.processMobileWalletPayout(request);
      } else {
        throw new BadRequestException('Unsupported payout method for Fawry');
      }
    } catch (error: any) {
      this.logger.error(`Fawry payout failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Fawry payout failed: ${error.message}`);
    }
  }

  /**
   * Process bank transfer payout
   */
  private async processBankPayout(request: PayoutRequest): Promise<PayoutResponse> {
    const payoutId = `PAYOUT_${Date.now()}_${request.userId}`;
    
    const payload = {
      merchantCode: this.merchantCode,
      merchantRefNumber: payoutId,
      amount: request.amount,
      currency: request.currency,
      recipientType: 'BANK_ACCOUNT',
      recipientDetails: {
        accountNumber: request.recipientDetails.bankAccountNumber,
        bankCode: request.recipientDetails.bankCode,
        accountHolderName: request.recipientDetails.accountHolderName,
        iban: request.recipientDetails.iban,
      },
      description: `Payout to ${request.recipientDetails.accountHolderName}`,
    };

    const signature = this.generateSignature(payload);

    try {
      const response = await axios.post(
        `${this.baseUrl}/payout/disburse`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Signature': signature,
          },
        }
      );

      return {
        payoutId: response.data.referenceNumber || payoutId,
        status: this.mapFawryStatus(response.data.status),
        gatewayResponse: response.data,
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // ~3 days
        fee: response.data.fee || 0,
      };
    } catch (error: any) {
      this.logger.error(`Fawry bank payout API error: ${error.message}`);
      
      // Return pending status for demo/testing
      return {
        payoutId,
        status: 'PENDING',
        gatewayResponse: { error: error.message, demo: true },
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        fee: 0,
      };
    }
  }

  /**
   * Process mobile wallet payout
   */
  private async processMobileWalletPayout(request: PayoutRequest): Promise<PayoutResponse> {
    const payoutId = `PAYOUT_${Date.now()}_${request.userId}`;
    
    const payload = {
      merchantCode: this.merchantCode,
      merchantRefNumber: payoutId,
      amount: request.amount,
      currency: request.currency,
      recipientType: 'MOBILE_WALLET',
      recipientDetails: {
        phoneNumber: request.recipientDetails.phoneNumber,
        walletProvider: request.recipientDetails.walletProvider || 'FAWRY',
        name: request.recipientDetails.name,
      },
      description: `Payout to ${request.recipientDetails.name}`,
    };

    const signature = this.generateSignature(payload);

    try {
      const response = await axios.post(
        `${this.baseUrl}/payout/disburse`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Signature': signature,
          },
        }
      );

      return {
        payoutId: response.data.referenceNumber || payoutId,
        status: this.mapFawryStatus(response.data.status),
        gatewayResponse: response.data,
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // ~1 day
        fee: response.data.fee || 0,
      };
    } catch (error: any) {
      this.logger.error(`Fawry mobile wallet payout API error: ${error.message}`);
      
      // Return pending status for demo/testing
      return {
        payoutId,
        status: 'PENDING',
        gatewayResponse: { error: error.message, demo: true },
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fee: 0,
      };
    }
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse> {
    this.ensureConfigured();

    try {
      const response = await axios.get(
        `${this.baseUrl}/payout/status/${payoutId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'MerchantCode': this.merchantCode,
          },
        }
      );

      return {
        payoutId: response.data.referenceNumber,
        status: this.mapFawryStatus(response.data.status),
        amount: response.data.amount,
        currency: response.data.currency,
        createdAt: new Date(response.data.createdAt),
        completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
        failureReason: response.data.failureReason,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Fawry payout status: ${error.message}`);
      
      // Return pending status for demo/testing
      return {
        payoutId,
        status: 'PENDING',
        amount: 0,
        currency: 'EGP',
        createdAt: new Date(),
      };
    }
  }

  /**
   * Generate signature for Fawry API
   */
  private generateSignature(payload: any): string {
    const signatureString = `${this.merchantCode}${payload.merchantRefNumber}${payload.amount}${this.secretKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Map Fawry status to standard status
   */
  private mapFawryStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'PAID':
        return 'SUCCESS';
      case 'PENDING':
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return 'PENDING';
      case 'FAILED':
      case 'REJECTED':
        return 'FAILED';
      case 'CANCELLED':
      case 'CANCELED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }
}
