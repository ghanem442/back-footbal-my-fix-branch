import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Add connection pool settings to DATABASE_URL if not present
    const databaseUrl = process.env.DATABASE_URL || '';
    const hasPoolSettings = databaseUrl.includes('connection_limit') || databaseUrl.includes('pool_timeout');
    
    let enhancedUrl = databaseUrl;
    if (!hasPoolSettings && databaseUrl) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      enhancedUrl = `${databaseUrl}${separator}connection_limit=10&pool_timeout=20&connect_timeout=30`;
      console.log('📊 Enhanced DATABASE_URL with connection pool settings');
    }

    super({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: enhancedUrl,
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log('🔌 Connecting to database...');
    const startTime = Date.now();
    await this.$connect();
    this.logger.log(`✅ Database connected (${Date.now() - startTime}ms)`);
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('✅ Database disconnected');
  }
}
