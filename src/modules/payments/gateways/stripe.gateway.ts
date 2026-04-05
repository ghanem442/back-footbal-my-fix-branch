import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BasePaymentGateway } from './base-payment-gateway';
import { PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';

/**
 * Stripe Payment Gateway
 * 
 * Implementation of PaymentGateway interface for Stripe.
 * Handles payment processing, webhook callbacks, and refunds through Stripe API.
 * 
 * Requirements: 10.1, 22.3
 */
@Injectable()
export class StripeGateway extends BasePaymentGateway {
  private readonly stripe: Stripe | null = null;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    super('Stripe');
    
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    
    if (apiKey && apiKey !== 'your-stripe-secret-key') {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2026-01-28.clover',
      });
      this.isConfigured = true;
      this.logger.log('Stripe gateway initialized successfully');
    } else {
      this.logger.warn('Stripe credentials not configured. Stripe payments will not be available.');
    }
  }

  /**
   * Check if gateway is configured
   */
  private ensureConfigured(): void {
    if (!this.isConfigured || !this.stripe) {
      throw new BadRequestException('Stripe payment gateway is not configured. Please configure STRIPE_SECRET_KEY in environment variables.');
    }
  }

  /**
   * Process payment via Stripe API
   * @param request Payment request details
   * @returns Payment response with Stripe transaction details
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.ensureConfigured();
    this.logPaymentOperation('processPayment', { bookingId: request.bookingId, amount: request.amount });
    
    try {
      // Create a payment intent
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        metadata: {
          bookingId: request.bookingId,
          userId: request.userId,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        transactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        gatewayResponse: paymentIntent,
        redirectUrl: paymentIntent.next_action?.redirect_to_url?.url || undefined,
      };
    } catch (error: any) {
      this.logPaymentError('processPayment', error);
      throw new InternalServerErrorException(`Stripe payment failed: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook callbacks
   * @param payload Stripe webhook payload
   * @param signature Stripe signature header
   * @returns Parsed webhook result
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    this.ensureConfigured();
    
    try {
      let event: Stripe.Event;

      // Verify webhook signature if secret is configured
      if (this.webhookSecret && signature) {
        try {
          event = this.stripe!.webhooks.constructEvent(
            payload,
            signature,
            this.webhookSecret
          );
        } catch (error: any) {
          this.logPaymentError('handleWebhook - signature verification', error);
          throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
        }
      } else {
        // Parse the event without verification (for testing)
        event = typeof payload === 'string' ? JSON.parse(payload) : payload;
      }

      this.logPaymentOperation('handleWebhook', { eventType: event.type, eventId: event.id });

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        
        case 'payment_intent.payment_failed':
          return this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        
        case 'charge.refunded':
          return this.handleChargeRefunded(event.data.object as Stripe.Charge);
        
        default:
          this.logger.warn(`Unhandled Stripe event type: ${event.type}`);
          throw new BadRequestException(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      this.logPaymentError('handleWebhook', error);
      throw error;
    }
  }

  /**
   * Process refund via Stripe API
   * @param transactionId Stripe payment intent ID
   * @param amount Amount to refund
   * @returns Refund response
   */
  async refund(transactionId: string, amount: number): Promise<RefundResponse> {
    this.ensureConfigured();
    this.logPaymentOperation('refund', { transactionId, amount });
    
    try {
      const refund = await this.stripe!.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100), // Convert to cents
      });

      return {
        refundId: refund.id,
        status: this.mapRefundStatus(refund.status || 'pending'),
        amount: refund.amount / 100, // Convert back to currency units
        gatewayResponse: refund,
      };
    } catch (error: any) {
      this.logPaymentError('refund', error);
      throw new InternalServerErrorException(`Stripe refund failed: ${error.message}`);
    }
  }

  /**
   * Handle successful payment intent
   */
  private handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): WebhookResult {
    return {
      transactionId: paymentIntent.id,
      status: 'SUCCESS',
      bookingId: paymentIntent.metadata.bookingId,
      metadata: {
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method,
      },
    };
  }

  /**
   * Handle failed payment intent
   */
  private handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): WebhookResult {
    return {
      transactionId: paymentIntent.id,
      status: 'FAILED',
      bookingId: paymentIntent.metadata.bookingId,
      metadata: {
        error: paymentIntent.last_payment_error?.message,
        failureCode: paymentIntent.last_payment_error?.code,
      },
    };
  }

  /**
   * Handle charge refunded
   */
  private handleChargeRefunded(charge: Stripe.Charge): WebhookResult {
    return {
      transactionId: charge.payment_intent as string,
      status: 'SUCCESS',
      bookingId: charge.metadata.bookingId,
      metadata: {
        refunded: true,
        amountRefunded: charge.amount_refunded / 100,
      },
    };
  }

  /**
   * Map Stripe payment intent status to our standard status
   */
  private mapStripeStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status) {
      case 'succeeded':
        return 'SUCCESS';
      case 'processing':
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'PENDING';
      case 'canceled':
      case 'requires_capture':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Map Stripe refund status to our standard status
   */
  private mapRefundStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
    switch (status) {
      case 'succeeded':
        return 'SUCCESS';
      case 'pending':
        return 'PENDING';
      case 'failed':
      case 'canceled':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
