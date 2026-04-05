import { Logger } from '@nestjs/common';
import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';

/**
 * Base Payment Gateway
 * 
 * Abstract base class providing common functionality for payment gateway implementations.
 * Concrete gateway classes should extend this and implement the abstract methods.
 */
export abstract class BasePaymentGateway implements PaymentGateway {
  protected readonly logger: Logger;

  constructor(protected readonly gatewayName: string) {
    this.logger = new Logger(`${gatewayName}Gateway`);
  }

  /**
   * Process a payment through the gateway
   */
  abstract processPayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Handle webhook callbacks from the gateway
   */
  abstract handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;

  /**
   * Process a refund through the gateway
   */
  abstract refund(transactionId: string, amount: number): Promise<RefundResponse>;

  /**
   * Log payment operation
   */
  protected logPaymentOperation(operation: string, details: any): void {
    this.logger.log(`${operation}: ${JSON.stringify(details)}`);
  }

  /**
   * Log payment error
   */
  protected logPaymentError(operation: string, error: any): void {
    this.logger.error(`${operation} failed: ${error.message}`, error.stack);
  }
}
