import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@modules/redis/redis.service';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  ttl: number; // Time window in seconds
  limit: number; // Max requests in the time window
}

/**
 * Rate limiting guard using Redis with sliding window
 * Tracks requests per IP address
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting in development environment
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      return true;
    }

    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const key = `rate_limit:${request.route.path}:${ip}`;

    const redis = this.redisService.getCacheClient();
    const { ttl, limit } = rateLimitOptions;

    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      // Get TTL to inform user when they can retry
      const ttlSeconds = await redis.ttl(key);
      
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: {
              en: `Too many requests. Please try again in ${ttlSeconds} seconds.`,
              ar: `عدد كبير جدًا من الطلبات. يرجى المحاولة مرة أخرى بعد ${ttlSeconds} ثانية.`,
            },
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    if (count === 0) {
      // First request in window - set with expiration
      await redis.setEx(key, ttl, '1');
    } else {
      // Increment existing counter
      await redis.incr(key);
    }

    return true;
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
