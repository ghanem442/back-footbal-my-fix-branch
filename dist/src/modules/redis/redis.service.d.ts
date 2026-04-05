import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { AppConfigService } from '@config/config.service';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private cacheClient;
    private queueClient;
    constructor(configService: AppConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getCacheClient(): RedisClientType;
    getQueueClient(): RedisClientType;
    healthCheck(): Promise<boolean>;
    getConnectionOptions(): {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
    };
}
