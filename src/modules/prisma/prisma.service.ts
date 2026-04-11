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
      // Reasonable timeouts - not hiding the problem
      enhancedUrl = `${databaseUrl}${separator}connection_limit=10&pool_timeout=10&connect_timeout=10`;
      console.log('📊 Enhanced DATABASE_URL with connection pool settings');
      console.log('   - connection_limit: 10');
      console.log('   - pool_timeout: 10s');
      console.log('   - connect_timeout: 10s');
    }

    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      datasources: {
        db: {
          url: enhancedUrl,
        },
      },
    });

    // Log SQL queries with timing
    (this as any).$on('query', (e: any) => {
      console.log('📝 SQL Query:', e.query);
      console.log('⏱️  Duration:', e.duration, 'ms');
      if (e.params) {
        console.log('📋 Params:', e.params);
      }
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
