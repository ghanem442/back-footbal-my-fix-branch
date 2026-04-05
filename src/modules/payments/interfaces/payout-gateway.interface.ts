/**
 * Payout Gateway Interface
 * 
 * Defines the contract for payout/withdrawal operations through payment gateways.
 * This interface supports transferring funds to field owners' bank accounts or mobile wallets.
 */

export interface PayoutRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PayoutMethod;
  recipientDetails: RecipientDetails;
  metadata?: Record<string, any>;
}

export interface RecipientDetails {
  // Bank transfer details
  bankAccountNumber?: string;
  bankName?: string;
  bankCode?: string;
  accountHolderName?: string;
  iban?: string;
  swiftCode?: string;

  // Mobile wallet details
  phoneNumber?: string;
  walletProvider?: string;

  // Common
  email?: string;
  name?: string;
}

export enum PayoutMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_WALLET = 'MOBILE_WALLET',
  STRIPE_CONNECT = 'STRIPE_CONNECT',
  FAWRY_PAYOUT = 'FAWRY_PAYOUT',
  VODAFONE_CASH = 'VODAFONE_CASH',
  INSTAPAY = 'INSTAPAY',
}

export interface PayoutResponse {
  payoutId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  gatewayResponse: any;
  estimatedArrival?: Date;
  fee?: number;
}

export interface PayoutStatusResponse {
  payoutId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  createdAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export interface PayoutGateway {
  /**
   * Process a payout to a recipient
   * @param request Payout request details
   * @returns Payout response with transaction ID and status
   */
  processPayout(request: PayoutRequest): Promise<PayoutResponse>;

  /**
   * Check the status of a payout
   * @param payoutId Payout transaction ID
   * @returns Current payout status
   */
  getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse>;

  /**
   * Cancel a pending payout
   * @param payoutId Payout transaction ID
   * @returns Cancellation result
   */
  cancelPayout?(payoutId: string): Promise<{ success: boolean; message: string }>;
}
