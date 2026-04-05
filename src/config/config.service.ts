import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('app.nodeEnv', 'development');
  }

  get port(): number {
    return this.configService.get<number>('app.port', 3000);
  }

  get appName(): string {
    return this.configService.get<string>('app.name', 'Football Field Booking API');
  }

  get databaseUrl(): string {
    return this.configService.get<string>('database.url')!;
  }

  get redisHost(): string {
    return this.configService.get<string>('redis.host', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('redis.port', 6379);
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('redis.password');
  }

  get redisDb(): number {
    return this.configService.get<number>('redis.db', 0);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret')!;
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('jwt.refreshSecret')!;
  }

  get jwtAccessExpiration(): string {
    return this.configService.get<string>('jwt.accessExpiration', '15m');
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>('jwt.refreshExpiration', '7d');
  }

  // Generic get method for accessing any config value
  get(key: string): any {
    return this.configService.get(key);
  }

  get depositPercentage(): number {
    return this.configService.get<number>('system.depositPercentage', 20);
  }

  get globalCommissionRate(): number {
    return this.configService.get<number>('system.globalCommissionRate', 10);
  }
}
