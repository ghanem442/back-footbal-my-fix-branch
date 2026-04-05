import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';

/**
 * InstaPay Payment Gateway
 * 
 * Implementation of PaymentGateway interface for InstaPay.
 * Handles payment processing, callback handling, and refunds through InstaPay API.
 * 
 * Requirements: 10.4, 22.3
 */
@Injectable()
export class InstaPayGateway extends BasePaymentGateway {
  private readonly httpClient: AxiosInstance;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    super('InstaPay');
    
    this.merchantId = this.configService.get<string>('INSTAPAY_MERCHANT_ID') || '';
    this.apiKey = this.configService.get<string>('INSTAPAY_API_KEY') || '';
    this.secretKey = this.configService.get<string>('INSTAPAY_SECRET_KEY') || '';
    this.baseUrl = this.configService.get<string>('INSTAPAY_BASE_URL') || 'https://api.instapay.com.eg';
    
    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      this.logger.warn('InstaPay credentials not configured');
    }
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * Process payment via InstaPay API
   * @param request Payment request details
   * @returns Payment response with InstaPay transaction details
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
    
    try {
      const orderRef = `IP-${request.bookingId}-${Date.now()}`;
      
      // Generate signature
      const signature = this.generateSignature(orderRef, request.amount);

      const payload = {
        merchantId: this.merchantId,
        orderReference: orderRef,
        amount: request.amount,
        currency: request.currency,
        customerName: request.metadata?.customerName || '',
        customerEmail: request.metadata?.email || '',
        customerPhone: request.metadata?.phoneNumber || '',
        description: `Football field booking ${request.bookingId}`,
        callbackUrl: request.metadata?.callbackUrl || '',
        returnUrl: request.metadata?.returnUrl || '',
        signature,
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
        },
      };

      const response = await this.httpClient.post('/v1/payments/create', payload);

      return {
        transactionId: response.data.transactionId || orderRef,
        status: this.mapInstaPayStatus(response.data.status),
        gatewayResponse: response.data,
        redirectUrl: response.data.paymentUrl || response.data.qrCodeUrl,
      };
    } catch (error: any) {
      this.logPaymentError('processPayment', error);
      throw new InternalServerErrorException(`InstaPay payment failed: ${error.message}`);
    }
  }

  /**
   * Handle InstaPay callback notifications
   * @param payload InstaPay callback payload
   * @param signature Optional signature (not used by InstaPay)
   * @returns Parsed webhook result
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    this.logPaymentOperation('handleWebhook', { transactionId: payload?.transactionId });
    
    try {
      // Verify callback signature
      const expectedSignature = this.generateCallbackSignature(
        payload.transactionId,
        payload.orderReference,
        payload.amount,
        payload.status
      );

      if (payload.signature !== expectedSignature) {
        throw new BadRequestException('Invalid callback signature');
      }

      // Extract booking ID from order reference
      const bookingId = payload.metadata?.bookingId || payload.orderReference?.split('-')[1];

      return {
        transactionId: payload.transactionId,
        status: this.mapInstaPayStatus(payload.status),
        bookingId,
        metadata: {
          amount: payload.amount,
          currency: payload.currency,
          paymentMethod: 'INSTAPAY',
          paymentDate: payload.paymentDate,
          customerPhone: payload.customerPhone,
        },
      };
    } catch (error: any) {
      this.logPaymentError('handleWebhook', error);
      throw error;
    }
  }

  /**
   * Process refund via InstaPay API
   * @param transactionId InstaPay transaction ID
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
        reason: 'Customer requested refund',
        signature,
      };

      const response = await this.httpClient.post('/v1/payments/refund', payload);

      return {
        refundId: response.data.refundId || refundRef,
        status: this.mapRefundStatus(response.data.status),
        amount,
        gatewayResponse: response.data,
      };
    } catch (error: any) {
      this.logPaymentError('refund', error);
      throw new InternalServerErrorException(`InstaPay refund failed: ${error.message}`);
    }
  }

  /**
   * Generate signature for payment request
   */
  private generateSignature(orderRef: string, amount: number): string {
    const signatureString = `${this.merchantId}${orderRef}${amount}${this.secretKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature for callback verification
   */
  private generateCallbackSignature(
    transactionId: string,
    orderRef: string,
    amount: number,
    status: string
  ): string {
    const signatureString = `${transactionId}${orderRef}${amount}${status}${this.secretKey}`;
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
   * Map InstaPay status to our standard status
   */
  private mapInstaPayStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'PAID':
      case 'CONFIRMED':
        return 'SUCCESS';
      case 'PENDING':
      case 'INITIATED':
      case 'PROCESSING':
      case 'AWAITING_PAYMENT':
        return 'PENDING';
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
      case 'DECLINED':
      case 'REJECTED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Map InstaPay refund status to our standard status
   */
  private mapRefundStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
      case 'REFUNDED':
        return 'SUCCESS';
      case 'PENDING':
      case 'PROCESSING':
        return 'PENDING';
      case 'FAILED':
      case 'REJECTED':
      case 'DECLINED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
