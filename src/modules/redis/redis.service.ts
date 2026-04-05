import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '@config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private cacheClient!: RedisClientType;
  private queueClient!: RedisClientType;

  constructor(private configService: AppConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      socket: {
        host: this.configService.redisHost,
        port: this.configService.redisPort,
      },
      password: this.configService.redisPassword,
      database: this.configService.redisDb,
    };

    // Cache client
    this.cacheClient = createClient(redisConfig);
    await this.cacheClient.connect();

    // Queue client (separate instance, same DB is fine for testing)
    this.queueClient = createClient(redisConfig);
    await this.queueClient.connect();
  }

  async onModuleDestroy() {
    await this.cacheClient.quit();
    await this.queueClient.quit();
  }

  getCacheClient(): RedisClientType {
    return this.cacheClient;
  }

  getQueueClient(): RedisClientType {
    return this.queueClient;
  }

  async healthCheck(): Promise<boolean> {
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
