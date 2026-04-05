/**
 * Payment Gateway Interface
 * 
 * Defines the contract that all payment gateway implementations must follow.
 * This interface supports multiple payment providers (Stripe, Fawry, Vodafone Cash, InstaPay).
 */

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  gatewayResponse: any;
  redirectUrl?: string;
}

export interface WebhookResult {
  transactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  bookingId: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  refundId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amount: number;
  gatewayResponse: any;
}

export interface PaymentGateway {
  /**
   * Process a payment for a booking
   * @param request Payment request details
   * @returns Payment response with transaction ID and status
   */
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Handle webhook callbacks from the payment gateway
   * @param payload Raw webhook payload from the gateway
   * @param signature Optional signature for verification (e.g., Stripe)
   * @returns Parsed webhook result
   */
  handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;

  /**
   * Refund a payment transaction
   * @param transactionId Original transaction ID
   * @param amount Amount to refund
   * @returns Refund response
   */
  refund(transactionId: string, amount: number): Promise<RefundResponse>;
}
