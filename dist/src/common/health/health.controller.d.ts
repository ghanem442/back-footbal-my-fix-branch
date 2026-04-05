import { Response } from 'express';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RedisService } from '@modules/redis/redis.service';
export declare class HealthController {
    private prismaService;
    private redisService;
    constructor(prismaService: PrismaService, redisService: RedisService);
    check(res: Response): Promise<Response<any, Record<string, any>>>;
    private checkDatabase;
}
