import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RedisService } from '@modules/redis/redis.service';

/**
 * Health Check Controller
 * Provides health check endpoints for container orchestration
 * 
 * Requirements: 28.3
 */
@Controller('health')
export class HealthController {
  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Health check endpoint
   * Returns 200 OK if all services are healthy
   * Returns 503 Service Unavailable if any service is unhealthy
   */
  @Get()
  async check(@Res() res: Response) {
    const startTime = Date.now();
    
    // Check database connectivity
    const dbHealthy = await this.checkDatabase();
    
    // Check Redis connectivity
    const redisHealthy = await this.redisService.healthCheck();
    
    const duration = Date.now() - startTime;
    const allHealthy = dbHealthy && redisHealthy;

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${duration}ms`,
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          type: 'PostgreSQL',
        },
        redis: {
          status: redisHealthy ? 'up' : 'down',
          type: 'Redis',
        },
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    // Return 503 if unhealthy, 200 if healthy
    const statusCode = allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(response);
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}
