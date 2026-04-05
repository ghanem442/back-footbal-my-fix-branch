import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Redis-based storage for distributed rate limiting
 * 
 * Requirements: 20.3, 20.4
 */
@Injectable()
export class RedisThrottlerStorageService
  implements ThrottlerStorage, OnApplicationShutdown
{
  private redis: Redis;
  private readonly keyPrefix = 'throttle:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = this.keyPrefix + key;
    const now = Date.now();
    const windowStart = now - ttl * 1000;

    // Use Redis sorted set to track requests within time window
    const multi = this.redis.multi();

    // Remove old entries outside the time window
    multi.zremrangebyscore(fullKey, 0, windowStart);

    // Add current request
    multi.zadd(fullKey, now, `${now}`);

    // Count requests in current window
    multi.zcount(fullKey, windowStart, now);

    // Set expiration
    multi.expire(fullKey, ttl);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    // Get count from zcount result
    const count = results[2][1] as number;
    const timeToReset = Math.ceil(ttl * 1000);

    return {
      totalHits: count,
      timeToExpire: timeToReset,
      isBlocked: count > limit,
      timeToBlockExpire: count > limit ? blockDuration : 0,
    };
  }
}
