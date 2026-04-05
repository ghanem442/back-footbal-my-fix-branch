import { OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
export interface SlotGenerationJobData {
    fieldId: string;
    schedule: RecurringSchedule;
}
export interface RecurringSchedule {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    slotDuration: number;
    price: number;
    startDate: Date;
    endDate: Date;
}
export declare class SlotsProcessor implements OnModuleInit {
    private readonly redisService;
    private readonly prisma;
    private readonly logger;
    private worker;
    constructor(redisService: RedisService, prisma: PrismaService);
    onModuleInit(): void;
    private handleGeneration;
    private handleBulkGeneration;
    processRecurringSlotGeneration(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
