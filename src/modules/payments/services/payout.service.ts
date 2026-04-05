import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PayoutGateway, PayoutRequest, PayoutResponse, PayoutStatusResponse } from '../interfaces/payout-gateway.interface';

/**
 * Payout Service
 * 
 * Manages payout gateway registry and orchestrates payout operations.
 * Implements the Registry Pattern for managing multiple payout providers.
 */
@Injectable()
export class PayoutService {
  private readonly gateways: Map<string, PayoutGateway> = new Map();
  private readonly logger = new Logger(PayoutService.name);

  /**
   * Register a payout gateway
   * @param name Gateway identifier (e.g., 'stripe', 'fawry')
   * @param gateway Gateway implementation
   */
  registerGateway(name: string, gateway: PayoutGateway): void {
    this.gateways.set(name.toLowerCase(), gateway);
    this.logger.log(`Payout gateway '${name}' registered successfully`);
  }

  /**
   * Get a registered payout gateway
   * @param name Gateway identifier
   * @returns Payout gateway instance
   * @throws NotFoundException if gateway is not registered
   */
  getGateway(name: string): PayoutGateway {
    const gateway = this.gateways.get(name.toLowerCase());
    if (!gateway) {
      throw new NotFoundException(`Payout gateway '${name}' is not registered`);
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
   * Process a payout through the specified gateway
   * @param gatewayName Gateway to use for payout
   * @param request Payout request details
   * @returns Payout response
   */
  async processPayout(gatewayName: string, request: PayoutRequest): Promise<PayoutResponse> {
    this.validatePayoutRequest(request);
    
    this.logger.log(`Processing payout via ${gatewayName} for user ${request.userId}, amount: ${request.amount}`);
    
    const gateway = this.getGateway(gatewayName);
    const response = await gateway.processPayout(request);
    
    this.logger.log(`Payout processed: ${response.payoutId}, status: ${response.status}`);
    
    return response;
  }

  /**
   * Get payout status
   * @param gatewayName Gateway that processed the payout
   * @param payoutId Payout transaction ID
   * @returns Payout status
   */
  async getPayoutStatus(gatewayName: string, payoutId: string): Promise<PayoutStatusResponse> {
    const gateway = this.getGateway(gatewayName);
    return await gateway.getPayoutStatus(payoutId);
  }

  /**
   * Cancel a pending payout
   * @param gatewayName Gateway that processed the payout
   * @param payoutId Payout transaction ID
   * @returns Cancellation result
   */
  async cancelPayout(gatewayName: string, payoutId: string): Promise<{ success: boolean; message: string }> {
    const gateway = this.getGateway(gatewayName);
    
    if (!gateway.cancelPayout) {
      throw new BadRequestException(`Gateway '${gatewayName}' does not support payout cancellation`);
    }
    
    return await gateway.cancelPayout(payoutId);
  }

  /**
   * Validate payout request
   */
  private validatePayoutRequest(request: PayoutRequest): void {
    if (!request.userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!request.amount || request.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (!request.currency) {
      throw new BadRequestException('Currency is required');
    }

    if (!request.paymentMethod) {
      throw new BadRequestException('Payment method is required');
    }

    if (!request.recipientDetails) {
      throw new BadRequestException('Recipient details are required');
    }

    // Validate recipient details based on payment method
    const details = request.recipientDetails;
    
    if (request.paymentMethod.toString().includes('BANK')) {
      if (!details.bankAccountNumber && !details.iban) {
        throw new BadRequestException('Bank account number or IBAN is required for bank transfers');
      }
      if (!details.accountHolderName) {
        throw new BadRequestException('Account holder name is required for bank transfers');
      }
    }

    if (request.paymentMethod.toString().includes('MOBILE') || request.paymentMethod.toString().includes('WALLET')) {
      if (!details.phoneNumber) {
        throw new BadRequestException('Phone number is required for mobile wallet payouts');
      }
    }
  }
}
