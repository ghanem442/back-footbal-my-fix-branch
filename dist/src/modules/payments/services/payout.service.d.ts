import { PayoutGateway, PayoutRequest, PayoutResponse, PayoutStatusResponse } from '../interfaces/payout-gateway.interface';
export declare class PayoutService {
    private readonly gateways;
    private readonly logger;
    registerGateway(name: string, gateway: PayoutGateway): void;
    getGateway(name: string): PayoutGateway;
    getAvailableGateways(): string[];
    processPayout(gatewayName: string, request: PayoutRequest): Promise<PayoutResponse>;
    getPayoutStatus(gatewayName: string, payoutId: string): Promise<PayoutStatusResponse>;
    cancelPayout(gatewayName: string, payoutId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private validatePayoutRequest;
}
