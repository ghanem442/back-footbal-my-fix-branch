import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';

/**
 * Fawry Payment Gateway
 * 
 * Implementation of PaymentGateway interface for Fawry.
 * Handles payment processing, callback handling, and refunds through Fawry API.
 * 
 * Requirements: 10.2, 22.3
 */
@Injectable()
export class FawryGateway extends BasePaymentGateway {
  private readonly httpClient: AxiosInstance;
  private readonly merchantCode: string;
  private readonly securityKey: string;
  private readonly baseUrl: string;
  private readonly isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    super('Fawry');
    
    this.merchantCode = this.configService.get<string>('FAWRY_MERCHANT_CODE') || '';
    this.securityKey = this.configService.get<string>('FAWRY_SECRET_KEY') || '';
    this.baseUrl = this.configService.get<string>('FAWRY_BASE_URL') || 'https://atfawry.fawrystaging.com';
    
    if (this.merchantCode && this.securityKey && 
        this.merchantCode !== 'your-fawry-merchant-code' && 
        this.securityKey !== 'your-fawry-secret-key') {
      this.isConfigured = true;
      this.logger.log('Fawry gateway initialized successfully');
    } else {
      this.logger.warn('Fawry credentials not configured. Fawry payments will not be available.');
    }
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if gateway is configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new BadRequestException('Fawry payment gateway is not configured. Please configure FAWRY_MERCHANT_CODE and FAWRY_SECRET_KEY in environment variables.');
    }
  }

  /**
   * Process payment via Fawry API
   * @param request Payment request details
   * @returns Payment response with Fawry transaction details
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.ensureConfigured();
    this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
    
    try {
      const merchantRefNumber = `${request.bookingId}-${Date.now()}`;
      const chargeItems = [
        {
          itemId: request.bookingId,
          description: `Booking ${request.bookingId}`,
          price: request.amount,
          quantity: 1,
        },
      ];

      // Generate signature
      const signature = this.generateSignature(
        merchantRefNumber,
        request.userId,
        request.amount
      );

      const payload = {
        merchantCode: this.merchantCode,
        merchantRefNumber,
        customerProfileId: request.userId,
        customerMobile: request.metadata?.phoneNumber || '',
        customerEmail: request.metadata?.email || '',
        paymentMethod: 'PAYATFAWRY',
        amount: request.amount,
        currencyCode: request.currency,
        chargeItems,
        signature,
        description: `Football field booking ${request.bookingId}`,
        paymentExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const response = await this.httpClient.post('/ECommerceWeb/Fawry/payments/charge', payload);

      return {
        transactionId: response.data.referenceNumber || merchantRefNumber,
        status: this.mapFawryStatus(response.data.paymentStatus),
        gatewayResponse: response.data,
        redirectUrl: response.data.paymentUrl,
      };
    } catch (error: any) {
      this.logPaymentError('processPayment', error);
      throw new InternalServerErrorException(`Fawry payment failed: ${error.message}`);
    }
  }

  /**
   * Handle Fawry callback notifications
   * @param payload Fawry callback payload
   * @param signature Optional signature (not used by Fawry)
   * @returns Parsed webhook result
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    this.ensureConfigured();
    this.logPaymentOperation('handleWebhook', { referenceNumber: payload?.referenceNumber });
    
    try {
      // Verify callback signature
      const expectedSignature = this.generateCallbackSignature(
        payload.merchantRefNumber,
        payload.orderAmount
      );

      if (payload.messageSignature !== expectedSignature) {
        throw new BadRequestException('Invalid callback signature');
      }

      // Extract booking ID from merchant reference number
      const bookingId = payload.merchantRefNumber?.split('-')[0];

      return {
        transactionId: payload.referenceNumber,
        status: this.mapFawryStatus(payload.orderStatus),
        bookingId,
        metadata: {
          amount: payload.orderAmount,
          paymentMethod: payload.paymentMethod,
          paymentTime: payload.paymentTime,
        },
      };
    } catch (error: any) {
      this.logPaymentError('handleWebhook', error);
      throw error;
    }
  }

  /**
   * Process refund via Fawry API
   * @param transactionId Fawry transaction reference number
   * @param amount Amount to refund
   * @returns Refund response
   */
  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    this.ensureConfigured();
    this.logPaymentOperation('refund', { transactionId, amount });
    
    try {
      const refundReference = `REF-${transactionId}-${Date.now()}`;
      
      // Generate refund signature
      const signature = this.generateRefundSignature(transactionId, refundReference, amount);

      const payload = {
        merchantCode: this.merchantCode,
        referenceNumber: transactionId,
        refundReference,
        refundAmount: amount,
        signature,
      };

      const response = await this.httpClient.post('/ECommerceWeb/Fawry/payments/refund', payload);

      return {
        refundId: response.data.refundReference || refundReference,
        status: this.mapRefundStatus(response.data.status),
        amount,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      this.logPaymentError('refund', error);
      throw new InternalServerErrorException(`Fawry refund failed: ${error.message}`);
    }
  }

  /**
   * Generate signature for payment request
   */
  private generateSignature(merchantRefNumber: string, customerId: string, amount: number): string {
    const signatureString = `${this.merchantCode}${merchantRefNumber}${customerId}${amount}${this.securityKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature for callback verification
   */
  private generateCallbackSignature(merchantRefNumber: string, amount: number): string {
    const signatureString = `${this.merchantCode}${merchantRefNumber}${amount}${this.securityKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature for refund request
   */
  private generateRefundSignature(referenceNumber: string, refundReference: string, amount: number): string {
    const signatureString = `${this.merchantCode}${referenceNumber}${refundReference}${amount}${this.securityKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Map Fawry status to our standard status
   */
  private mapFawryStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'SUCCESS':
        return 'SUCCESS';
      case 'UNPAID':
      case 'PENDING':
      case 'NEW':
        return 'PENDING';
      case 'FAILED':
      case 'CANCELED':
      case 'EXPIRED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Map Fawry refund status to our standard status
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
