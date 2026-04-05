import { PrismaService } from '@modules/prisma/prisma.service';
import { I18nService } from '@modules/i18n/i18n.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { BulkCreateTimeSlotsDto } from './dto/bulk-create-time-slots.dto';
export declare class TimeSlotsService {
    private readonly prisma;
    private readonly i18n;
    constructor(prisma: PrismaService, i18n: I18nService);
    createTimeSlot(userId: string, dto: CreateTimeSlotDto): Promise<{
        field: {
            id: string;
            name: string;
            address: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        status: import(".prisma/client").$Enums.SlotStatus;
        fieldId: string;
        startTime: Date;
        endTime: Date;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    private parseTime;
    queryTimeSlots(dto: QueryTimeSlotsDto): Promise<{
        data: ({
            field: {
                id: string;
                name: string;
                address: string;
                latitude: number | null;
                longitude: number | null;
                averageRating: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            status: import(".prisma/client").$Enums.SlotStatus;
            fieldId: string;
            startTime: Date;
            endTime: Date;
            price: import("@prisma/client/runtime/library").Decimal;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateTimeSlot(timeSlotId: string, userId: string, dto: Partial<{
        date: string;
        startTime: string;
        endTime: string;
        price: number;
    }>): Promise<{
        field: {
            id: string;
            name: string;
            address: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        status: import(".prisma/client").$Enums.SlotStatus;
        fieldId: string;
        startTime: Date;
        endTime: Date;
        price: import("@prisma/client/runtime/library").Decimal;
    }>;
    deleteTimeSlot(timeSlotId: string, userId: string): Promise<void>;
    private formatTime;
    bulkCreateTimeSlots(userId: string, dto: BulkCreateTimeSlotsDto): Promise<{
        count: number;
        dates: number;
        timeRanges: number;
    }>;
}
