/**
 * Payment Module Usage Examples
 * 
 * This file demonstrates how to use the payment gateway abstraction
 * in various scenarios within the Football Field Booking Backend.
 */

import { Injectable } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { PaymentRequest } from '../interfaces/payment-gateway.interface';

/**
 * Example: Booking Service Integration
 * 
 * Shows how to integrate payment processing into the booking flow.
 */
@Injectable()
export class BookingPaymentExample {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Process payment for a new booking
   */
  async processBookingPayment(
    bookingId: string,
    amount: number,
    userId: string,
    gatewayName: string,
  ) {
    // Prepare payment request
    const paymentRequest: PaymentRequest = {
      bookingId,
      amount,
      currency: 'EGP',
      userId,
      metadata: {
        bookingType: 'field_reservation',
        timestamp: new Date().toISOString(),
      },
    };

    try {
      // Initiate payment through selected gateway
      const response = await this.paymentService.initiatePayment(
        gatewayName,
        paymentRequest,
      );

      // Handle response based on status
      if (response.status === 'SUCCESS') {
        // Payment completed immediately
        return {
          success: true,
          transactionId: response.transactionId,
          message: 'Payment successful',
        };
      } else if (response.status === 'PENDING') {
        // Payment requires additional action (e.g., redirect)
        return {
          success: false,
          pending: true,
          redirectUrl: response.redirectUrl,
          message: 'Payment pending - redirect required',
        };
      } else {
        // Payment failed
        return {
          success: false,
          message: 'Payment failed',
        };
      }
    } catch (error) {
      // Handle errors (gateway not found, validation errors, etc.)
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(): string[] {
    return this.paymentService.getAvailableGateways();
  }
}

/**
 * Example: Webhook Handler
 * 
 * Shows how to handle payment gateway webhooks.
 */
@Injectable()
export class WebhookHandlerExample {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(payload: any) {
    const result = await this.paymentService.handleWebhook('stripe', payload);

    // Update booking status based on webhook result
    if (result.status === 'SUCCESS') {
      // Mark booking as confirmed
      await this.confirmBooking(result.bookingId, result.transactionId);
    } else {
      // Mark booking as failed
      await this.failBooking(result.bookingId);
    }

    return result;
  }

  /**
   * Handle Fawry callback
   */
  async handleFawryCallback(payload: any) {
    const result = await this.paymentService.handleWebhook('fawry', payload);
    
    // Process callback result
    return this.processWebhookResult(result);
  }

  private async confirmBooking(bookingId: string, transactionId: string) {
    // Implementation: Update booking status to CONFIRMED
    console.log(`Confirming booking ${bookingId} with transaction ${transactionId}`);
  }

  private async failBooking(bookingId: string) {
    // Implementation: Update booking status to PAYMENT_FAILED
    console.log(`Failing booking ${bookingId}`);
  }

  private async processWebhookResult(result: any) {
    // Common webhook processing logic
    return result;
  }
}

/**
 * Example: Refund Processing
 * 
 * Shows how to process refunds for cancelled bookings.
 */
@Injectable()
export class RefundProcessorExample {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Process full refund for cancelled booking
   */
  async processFullRefund(
    bookingId: string,
    transactionId: string,
    amount: number,
    gatewayName: string,
  ) {
    try {
      const refundResponse = await this.paymentService.processRefund(
        gatewayName,
        transactionId,
        amount,
      );

      if (refundResponse.status === 'SUCCESS') {
        // Credit user wallet
        await this.creditUserWallet(bookingId, amount);
        return {
          success: true,
          refundId: refundResponse.refundId,
          message: 'Refund processed successfully',
        };
      } else if (refundResponse.status === 'PENDING') {
        return {
          success: false,
          pending: true,
          message: 'Refund is being processed',
        };
      } else {
        return {
          success: false,
          message: 'Refund failed',
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process partial refund based on cancellation policy
   */
  async processPartialRefund(
    bookingId: string,
    transactionId: string,
    originalAmount: number,
    refundPercentage: number,
    gatewayName: string,
  ) {
    const refundAmount = originalAmount * (refundPercentage / 100);

    return this.processFullRefund(
      bookingId,
      transactionId,
      refundAmount,
      gatewayName,
    );
  }

  private async creditUserWallet(bookingId: string, amount: number) {
    // Implementation: Credit user's wallet with refund amount
    console.log(`Crediting wallet for booking ${bookingId} with ${amount}`);
  }
}

/**
 * Example: Multi-Gateway Payment Flow
 * 
 * Shows how to handle payment with fallback gateways.
 */
@Injectable()
export class MultiGatewayPaymentExample {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Try payment with primary gateway, fallback to secondary if needed
   */
  async processPaymentWithFallback(
    paymentRequest: PaymentRequest,
    primaryGateway: string,
    fallbackGateway: string,
  ) {
    try {
      // Try primary gateway
      const response = await this.paymentService.initiatePayment(
        primaryGateway,
        paymentRequest,
      );
      return { gateway: primaryGateway, response };
    } catch (error) {
      console.log(`Primary gateway ${primaryGateway} failed, trying fallback`);
      
      // Try fallback gateway
      const response = await this.paymentService.initiatePayment(
        fallbackGateway,
        paymentRequest,
      );
      return { gateway: fallbackGateway, response };
    }
  }

  /**
   * Get recommended gateway based on user preferences or region
   */
  getRecommendedGateway(userCountry: string, userPreference?: string): string {
    const availableGateways = this.paymentService.getAvailableGateways();

    // If user has a preference and it's available, use it
    if (userPreference && availableGateways.includes(userPreference)) {
      return userPreference;
    }

    // Otherwise, recommend based on country
    if (userCountry === 'EG') {
      // For Egypt, prefer local gateways
      if (availableGateways.includes('fawry')) return 'fawry';
      if (availableGateways.includes('vodafone_cash')) return 'vodafone_cash';
      if (availableGateways.includes('instapay')) return 'instapay';
    }

    // Default to Stripe for international
    return 'stripe';
  }
}
