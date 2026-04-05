import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
export declare class ThrottlerBehindProxyGuard extends ThrottlerGuard {
    canActivate(context: ExecutionContext): Promise<boolean>;
    protected getTracker(req: Record<string, any>): Promise<string>;
    protected getThrottlerSuffix(context: ExecutionContext, throttlerName: string): Promise<string>;
}
