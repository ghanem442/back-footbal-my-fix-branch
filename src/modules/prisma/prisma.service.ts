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
      // Increased timeouts for Railway
      enhancedUrl = `${databaseUrl}${separator}connection_limit=20&pool_timeout=60&connect_timeout=60`;
      console.log('📊 Enhanced DATABASE_URL with connection pool settings');
      console.log('   - connection_limit: 20');
      console.log('   - pool_timeout: 60s');
      console.log('   - connect_timeout: 60s');
    }

    super({
      log: ['query', 'error', 'warn'], // Added 'query' to see actual SQL
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
