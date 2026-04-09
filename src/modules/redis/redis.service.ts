import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '@config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private cacheClient!: RedisClientType;
  private queueClient!: RedisClientType;

  constructor(private configService: AppConfigService) {}

  async onModuleInit() {
    // Support REDIS_URL for Railway/cloud deployments
    const redisUrl = process.env.REDIS_URL;
    
    const redisConfig = redisUrl 
      ? { url: redisUrl }
      : {
          socket: {
            host: this.configService.redisHost,
            port: this.configService.redisPort,
          },
          password: this.configService.redisPassword,
          database: this.configService.redisDb,
        };

    try {
      // Cache client
      this.cacheClient = createClient(redisConfig);
      await this.cacheClient.connect();

      // Queue client (separate instance, same DB is fine for testing)
      this.queueClient = createClient(redisConfig);
      await this.queueClient.connect();
      
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', (error as Error).message);
      // Create mock clients that do nothing
      this.cacheClient = null as any;
      this.queueClient = null as any;
    }
  }

  async onModuleDestroy() {
    if (this.cacheClient) {
      await this.cacheClient.quit();
    }
    if (this.queueClient) {
      await this.queueClient.quit();
    }
  }

  getCacheClient(): RedisClientType {
    return this.cacheClient;
  }

  getQueueClient(): RedisClientType {
    return this.queueClient;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.cacheClient || !this.queueClient) {
      return false;
    }
    try {
      await this.cacheClient.ping();
      await this.queueClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Redis connection options for BullMQ
   * BullMQ needs connection options, not the client itself
   */
  getConnectionOptions() {
    return {
      host: this.configService.redisHost,
      port: this.configService.redisPort,
      password: this.configService.redisPassword,
      db: this.configService.redisDb,
    };
  }
}
