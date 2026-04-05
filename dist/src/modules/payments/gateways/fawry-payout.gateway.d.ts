import { ConfigService } from '@nestjs/config';
import { PayoutGateway, PayoutRequest, PayoutResponse, PayoutStatusResponse } from '../interfaces/payout-gateway.interface';
export declare class FawryPayoutGateway implements PayoutGateway {
    private readonly configService;
    private readonly merchantCode;
    private readonly secretKey;
    private readonly baseUrl;
    private readonly isConfigured;
    private readonly logger;
    constructor(configService: ConfigService);
    private ensureConfigured;
    processPayout(request: PayoutRequest): Promise<PayoutResponse>;
    private processBankPayout;
    private processMobileWalletPayout;
    getPayoutStatus(payoutId: string): Promise<PayoutStatusResponse>;
    private generateSignature;
    private mapFawryStatus;
}
