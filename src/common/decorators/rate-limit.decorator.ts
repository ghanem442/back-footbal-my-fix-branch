import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../guards/rate-limit.guard';

/**
 * Decorator to apply rate limiting to a route
 * @param options Rate limit configuration (ttl in seconds, limit is max requests)
 * 
 * @example
 * @RateLimit({ ttl: 900, limit: 5 }) // 5 requests per 15 minutes
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
