import { ConfigService } from '@nestjs/config';
import { PayoutGateway, PayoutRequest, PayoutResponse, PayoutStatusResponse } from '../interfaces/payout-gateway.interface';
export declare class StripePayoutGateway implements PayoutGateway {
    private readonly configService;
    private readonly stripe;
    private readonly isConfigured;
    private readonly logger;
    constructor(configService: ConfigService);
    private ensureConfigured;
    processPayout(request: PayoutRequest): Promise<PayoutResponse>;
    private processConnectPayout;
    private processBankPayout;
    getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse>;
    cancelPayout(payoutId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private mapPayoutStatus;
    private mapTransferStatus;
}
