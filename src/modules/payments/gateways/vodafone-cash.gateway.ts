import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';

/**
 * Vodafone Cash Payment Gateway
 * 
 * Implementation of PaymentGateway interface for Vodafone Cash.
 * Handles payment processing, callback handling, and refunds through Vodafone Cash API.
 * 
 * Requirements: 10.3, 22.3
 */
@Injectable()
export class VodafoneCashGateway extends BasePaymentGateway {
  private readonly httpClient: AxiosInstance;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    super('VodafoneCash');
    
    this.merchantId = this.configService.get<string>('VODAFONE_MERCHANT_ID') || '';
    this.apiKey = this.configService.get<string>('VODAFONE_API_KEY') || '';
    this.secretKey = this.configService.get<string>('VODAFONE_SECRET_KEY') || '';
    this.baseUrl = this.configService.get<string>('VODAFONE_BASE_URL') || 'https://api.vodafone.com.eg';
    
    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      this.logger.warn('Vodafone Cash credentials not configured');
    }
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });
  }

  /**
   * Process payment via Vodafone Cash API
   * @param request Payment request details
   * @returns Payment response with Vodafone Cash transaction details
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
    
    try {
      const transactionRef = `VF-${request.bookingId}-${Date.now()}`;
      
      // Generate signature
      const signature = this.generateSignature(transactionRef, request.amount);

      const payload = {
        merchantId: this.merchantId,
        transactionRef,
        amount: request.amount,
        currency: request.currency,
        customerMobile: request.metadata?.phoneNumber || '',
        customerEmail: request.metadata?.email || '',
        description: `Booking ${request.bookingId}`,
        callbackUrl: request.metadata?.callbackUrl || '',
        signature,
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
        },
      };

      const response = await this.httpClient.post('/payment/v1/initiate', payload);

      return {
        transactionId: response.data.transactionId || transactionRef,
        status: this.mapVodafoneStatus(response.data.status),
        gatewayResponse: response.data,
        redirectUrl: response.data.paymentUrl || response.data.ussdCode,
      };
    } catch (error: any) {
      this.logPaymentError('processPayment', error);
      throw new InternalServerErrorException(`Vodafone Cash payment failed: ${error.message}`);
    }
  }

  /**
   * Handle Vodafone Cash callback notifications
   * @param payload Vodafone Cash callback payload
   * @param signature Optional signature (not used by Vodafone)
   * @returns Parsed webhook result
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    this.logPaymentOperation('handleWebhook', { transactionId: payload?.transactionId });
    
    try {
      // Verify callback signature
      const expectedSignature = this.generateCallbackSignature(
        payload.transactionId,
        payload.amount,
        payload.status
      );

      if (payload.signature !== expectedSignature) {
        throw new BadRequestException('Invalid callback signature');
      }

      return {
        transactionId: payload.transactionId,
        status: this.mapVodafoneStatus(payload.status),
        bookingId: payload.metadata?.bookingId,
        metadata: {
          amount: payload.amount,
          currency: payload.currency,
          paymentMethod: 'VODAFONE_CASH',
          timestamp: payload.timestamp,
        },
      };
    } catch (error: any) {
      this.logPaymentError('handleWebhook', error);
      throw error;
    }
  }

  /**
   * Process refund via Vodafone Cash API
   * @param transactionId Vodafone Cash transaction ID
   * @param amount Amount to refund
   * @returns Refund response
   */
  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    this.logPaymentOperation('refund', { transactionId, amount });
    
    try {
      const refundRef = `REFUND-${transactionId}-${Date.now()}`;
      
      // Generate refund signature
      const signature = this.generateRefundSignature(transactionId, refundRef, amount);

      const payload = {
        merchantId: this.merchantId,
        originalTransactionId: transactionId,
        refundReference: refundRef,
        amount,
        signature,
      };

      const response = await this.httpClient.post('/payment/v1/refund', payload);

      return {
        refundId: response.data.refundId || refundRef,
        status: this.mapRefundStatus(response.data.status),
        amount,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      this.logPaymentError('refund', error);
      throw new InternalServerErrorException(`Vodafone Cash refund failed: ${error.message}`);
    }
  }

  /**
   * Generate signature for payment request
   */
  private generateSignature(transactionRef: string, amount: number): string {
    const signatureString = `${this.merchantId}${transactionRef}${amount}${this.secretKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature for callback verification
   */
  private generateCallbackSignature(transactionId: string, amount: number, status: string): string {
    const signatureString = `${transactionId}${amount}${status}${this.secretKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature for refund request
   */
  private generateRefundSignature(transactionId: string, refundRef: string, amount: number): string {
    const signatureString = `${this.merchantId}${transactionId}${refundRef}${amount}${this.secretKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Map Vodafone status to our standard status
   */
  private mapVodafoneStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'PAID':
        return 'SUCCESS';
      case 'PENDING':
      case 'INITIATED':
      case 'PROCESSING':
        return 'PENDING';
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
      case 'REJECTED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Map Vodafone refund status to our standard status
   */
  private mapRefundStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
        return 'SUCCESS';
      case 'PENDING':
      case 'PROCESSING':
        return 'PENDING';
      case 'FAILED':
      case 'REJECTED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
