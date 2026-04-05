import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@modules/redis/redis.service';
export declare const RATE_LIMIT_KEY = "rateLimit";
export interface RateLimitOptions {
    ttl: number;
    limit: number;
}
export declare class RateLimitGuard implements CanActivate {
    private reflector;
    private redisService;
    constructor(reflector: Reflector, redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private getClientIp;
}
