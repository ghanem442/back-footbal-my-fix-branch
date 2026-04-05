import { OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
export declare class RedisThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
    private redis;
    private readonly keyPrefix;
    constructor(redis: Redis);
    onApplicationShutdown(): Promise<void>;
    increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord>;
}
