import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentGateway, PaymentRequest, PaymentResponse, WebhookResult, RefundResponse } from '../interfaces/payment-gateway.interface';
import { LoggerService } from '@modules/logger/logger.service';

/**
 * Payment Service
 * 
 * Manages payment gateway registry and orchestrates payment operations.
 * Implements the Registry Pattern for managing multiple payment providers.
 * 
 * Requirements: 25.3
 */
@Injectable()
export class PaymentService {
  private readonly gateways: Map<string, PaymentGateway> = new Map();

  constructor(private readonly loggerService: LoggerService) {}

  /**
   * Register a payment gateway
   * @param name Gateway identifier (e.g., 'stripe', 'fawry')
   * @param gateway Gateway implementation
   */
  registerGateway(name: string, gateway: PaymentGateway): void {
    this.gateways.set(name.toLowerCase(), gateway);
  }

  /**
   * Get a registered payment gateway
   * @param name Gateway identifier
   * @returns Payment gateway instance
   * @throws NotFoundException if gateway is not registered
   */
  getGateway(name: string): PaymentGateway {
    const gateway = this.gateways.get(name.toLowerCase());
    if (!gateway) {
      throw new NotFoundException(`Payment gateway '${name}' is not registered`);
    }
    return gateway;
  }

  /**
   * Get all registered gateway names
   * @returns Array of gateway identifiers
   */
  getAvailableGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  /**
   * Initiate a payment through the specified gateway
   * @param gatewayName Gateway to use for payment
   * @param request Payment request details
   * @returns Payment response
   */
  async initiatePayment(gatewayName: string, request: PaymentRequest): Promise<PaymentResponse> {
    this.validatePaymentRequest(request);
    
    // Log payment initiation
    this.loggerService.logPaymentTransaction({
      bookingId: request.bookingId,
      gateway: gatewayName,
      amount: request.amount,
      currency: request.currency,
      status: 'initiated',
      userId: request.userId,
    });
    
    const gateway = this.getGateway(gatewayName);
    const response = await gateway.processPayment(request);
    
    // Log payment response
    this.loggerService.logPaymentTransaction({
      bookingId: request.bookingId,
      gateway: gatewayName,
      amount: request.amount,
      currency: request.currency,
      status: response.status.toLowerCase(),
      transactionId: response.transactionId,
      userId: request.userId,
    });
    
    return response;
  }

  /**
   * Handle webhook callback from a payment gateway
   * @param gatewayName Gateway that sent the webhook
   * @param payload Webhook payload
   * @param signature Optional signature for verification (e.g., Stripe)
   * @param rawBody Raw request body for signature verification
   * @returns Parsed webhook result
   */
  async handleWebhook(gatewayName: string, payload: any, signature?: string, rawBody?: string | Buffer): Promise<WebhookResult> {
    // Verify webhook signature before processing
    this.verifyWebhookSignature(gatewayName, payload, signature, rawBody);
    
    // Log webhook reception
    this.loggerService.logWebhook({
      gateway: gatewayName,
      event: payload.type || payload.event || 'unknown',
      status: 'received',
      payload: payload,
    });
    
    const gateway = this.getGateway(gatewayName);
    const result = await gateway.handleWebhook(payload, signature);
    
    // Log payment status change if applicable
    if (result.bookingId && result.status) {
      this.loggerService.logPaymentStatusChange({
        bookingId: result.bookingId,
        gateway: gatewayName,
        oldStatus: 'pending',
        newStatus: result.status,
        transactionId: result.transactionId,
      });
    }
    
    return result;
  }

  /**
   * Verify webhook signature to prevent fake webhooks
   * @param gateway Gateway name
   * @param payload Webhook payload
   * @param signature Signature from headers
   * @param rawBody Raw request body
   */
  private verifyWebhookSignature(
    gateway: string,
    payload: any,
    signature?: string,
    rawBody?: string | Buffer,
  ): void {
    // Note: Signature verification implementation depends on each gateway's requirements
    // This is a placeholder that should be implemented based on gateway documentation
    
    switch (gateway.toLowerCase()) {
      case 'stripe':
        // Stripe signature verification is handled in the gateway itself
        // The signature is passed through and validated there
        break;
        
      case 'fawry':
      case 'vodafone_cash':
      case 'instapay':
        // These gateways handle signature verification in their own implementations
        // The verification logic is in the respective gateway classes
        break;
        
      default:
        // Unknown gateway - log warning
        this.loggerService.warn(`Webhook signature verification not implemented for gateway: ${gateway}`);
    }
  }

  /**
   * Process a refund through the specified gateway
   * @param gatewayName Gateway to use for refund
   * @param transactionId Original transaction ID
   * @param amount Amount to refund
   * @returns Refund response
   */
  async processRefund(gatewayName: string, transactionId: string, amount: number): Promise<RefundResponse> {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    const gateway = this.getGateway(gatewayName);
    return gateway.refund(transactionId, amount);
  }

  /**
   * Validate payment request data
   * @param request Payment request to validate
   * @throws BadRequestException if validation fails
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.bookingId) {
      throw new BadRequestException('Booking ID is required');
    }
    if (!request.amount || request.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    if (!request.currency) {
      throw new BadRequestException('Currency is required');
    }
    if (!request.userId) {
      throw new BadRequestException('User ID is required');
    }
  }
}
