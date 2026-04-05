import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PaymentGateway,
  PaymentRequest,
  PaymentResponse,
  WebhookResult,
  RefundResponse,
} from '../interfaces/payment-gateway.interface';
import * as crypto from 'crypto';

/**
 * Paymob Payment Gateway
 * Supports Accept (card/wallet) integration
 * Docs: https://docs.paymob.com
 */
@Injectable()
export class PaymobGateway implements PaymentGateway {
  private readonly logger = new Logger(PaymobGateway.name);
  private readonly apiKey: string;
  private readonly integrationId: string;
  private readonly iframeId: string;
  private readonly hmacSecret: string;
  private readonly baseUrl = 'https://accept.paymob.com/api';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('PAYMOB_API_KEY', '');
    this.integrationId = this.config.get<string>('PAYMOB_INTEGRATION_ID', '');
    this.iframeId = this.config.get<string>('PAYMOB_IFRAME_ID', '');
    this.hmacSecret = this.config.get<string>('PAYMOB_HMAC_SECRET', '');

    if (!this.apiKey) {
      this.logger.warn('Paymob credentials not configured.');
    }
  }

  /**
   * Step 1: Auth token → Step 2: Order → Step 3: Payment key → return iframe URL
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Step 1: Authenticate
      const authRes = await axios.post(`${this.baseUrl}/auth/tokens`, {
        api_key: this.apiKey,
      });
      const authToken: string = authRes.data.token;

      // Step 2: Register order
      const orderRes = await axios.post(`${this.baseUrl}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(request.amount * 100),
        currency: request.currency || 'EGP',
        merchant_order_id: request.bookingId,
        items: [],
      });
      const orderId: string = String(orderRes.data.id);

      // Step 3: Payment key
      const paymentKeyRes = await axios.post(`${this.baseUrl}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: Math.round(request.amount * 100),
        expiration: 3600,
        order_id: orderId,
        billing_data: {
          apartment: 'NA',
          email: request.metadata?.playerEmail || 'player@fieldbook.com',
          floor: 'NA',
          first_name: 'Player',
          street: 'NA',
          building: 'NA',
          phone_number: request.metadata?.phoneNumber || '+201000000000',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EG',
          last_name: 'User',
          state: 'Cairo',
        },
        currency: request.currency || 'EGP',
        integration_id: parseInt(this.integrationId, 10),
        lock_order_when_paid: true,
      });

      const paymentToken: string = paymentKeyRes.data.token;
      const ngrokUrl = this.config.get<string>('NGROK_URL', '');
      const baseUrl = ngrokUrl || `http://localhost:3000`;
      const redirectUrl = `${baseUrl}/api/v1/payments/callback/paymob`;
      const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.iframeId}?payment_token=${paymentToken}`;

      this.logger.log(`Paymob payment initiated for booking ${request.bookingId}, order ${orderId}`);

      return {
        transactionId: orderId,
        status: 'PENDING',
        gatewayResponse: { orderId, paymentToken, iframeId: this.iframeId },
        redirectUrl: iframeUrl,
      };
    } catch (error: any) {
      const errMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(`Paymob payment failed: ${errMsg}`);
      console.error('=== PAYMOB ERROR DETAILS ===');
      console.error('Message:', error.message);
      console.error('Response data:', JSON.stringify(error?.response?.data, null, 2));
      console.error('Status:', error?.response?.status);
      console.error('============================');
      return {
        transactionId: '',
        status: 'FAILED',
        gatewayResponse: { error: errMsg },
      };
    }
  }

  /**
   * Handle Paymob webhook (HMAC verified)
   */
  async handleWebhook(payload: any, signature?: string): Promise<WebhookResult> {
    // Verify HMAC if secret is configured
    if (this.hmacSecret && signature) {
      const computed = this.computeHmac(payload);
      if (computed !== signature) {
        throw new Error('Paymob webhook HMAC verification failed');
      }
    }

    const obj = payload?.obj ?? payload;
    const transactionId = String(obj?.id ?? obj?.order?.id ?? '');
    const bookingId = obj?.order?.merchant_order_id ?? obj?.merchant_order_id ?? '';
    const success: boolean = obj?.success === true || obj?.success === 'true';
    const pending: boolean = obj?.pending === true || obj?.pending === 'true';

    const status = success ? 'SUCCESS' : pending ? 'PENDING' : 'FAILED';

    return {
      transactionId,
      status,
      bookingId,
      metadata: {
        paymobTransactionId: obj?.id,
        orderId: obj?.order?.id,
        amountCents: obj?.amount_cents,
        currency: obj?.currency,
        providerReference: obj?.source_data?.pan ?? obj?.id,
      },
    };
  }

  async refund(_transactionId: string, _amount: number): Promise<RefundResponse> {
    // Paymob refund via API — implement when needed
    return { refundId: '', status: 'PENDING', amount: _amount, gatewayResponse: { note: 'Manual refund required' } };
  }

  private computeHmac(payload: any): string {
    const obj = payload?.obj ?? payload;
    const fields = [
      obj?.amount_cents, obj?.created_at, obj?.currency, obj?.error_occured,
      obj?.has_parent_transaction, obj?.id, obj?.integration_id, obj?.is_3d_secure,
      obj?.is_auth, obj?.is_capture, obj?.is_refunded, obj?.is_standalone_payment,
      obj?.is_voided, obj?.order?.id, obj?.owner, obj?.pending,
      obj?.source_data?.pan, obj?.source_data?.sub_type, obj?.source_data?.type,
      obj?.success,
    ];
    const str = fields.map(f => (f === undefined || f === null ? '' : String(f))).join('');
    return crypto.createHmac('sha512', this.hmacSecret).update(str).digest('hex');
  }
}
