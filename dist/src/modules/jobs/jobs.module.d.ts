import { OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
export declare class JobsModule implements OnModuleDestroy {
    private readonly bookingsQueue;
    private readonly notificationsQueue;
    private readonly slotsQueue;
    constructor(bookingsQueue: Queue, notificationsQueue: Queue, slotsQueue: Queue);
    onModuleDestroy(): Promise<void>;
}
