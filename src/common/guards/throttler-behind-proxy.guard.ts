import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling in development environment
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return true;
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Get IP from X-Forwarded-For header if behind proxy, otherwise use remoteAddress
    return req.ips?.length ? req.ips[0] : req.ip || req.socket?.remoteAddress || 'unknown';
  }

  protected async getThrottlerSuffix(
    context: ExecutionContext,
    throttlerName: string,
  ): Promise<string> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);
    return `${tracker}-${throttlerName}`;
  }
}
