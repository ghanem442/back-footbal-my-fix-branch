import { ConfigService as NestConfigService } from '@nestjs/config';
export declare class AppConfigService {
    private configService;
    constructor(configService: NestConfigService);
    get nodeEnv(): string;
    get port(): number;
    get appName(): string;
    get databaseUrl(): string;
    get redisHost(): string;
    get redisPort(): number;
    get redisPassword(): string | undefined;
    get redisDb(): number;
    get jwtSecret(): string;
    get jwtRefreshSecret(): string;
    get jwtAccessExpiration(): string;
    get jwtRefreshExpiration(): string;
    get(key: string): any;
    get depositPercentage(): number;
    get globalCommissionRate(): number;
}
