import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { BulkCreateTimeSlotsDto } from './dto/bulk-create-time-slots.dto';
import { I18nService } from '@modules/i18n/i18n.service';
export declare class TimeSlotsController {
    private readonly timeSlotsService;
    private readonly i18n;
    constructor(timeSlotsService: TimeSlotsService, i18n: I18nService);
    createTimeSlot(userId: string, createTimeSlotDto: CreateTimeSlotDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    bulkCreateTimeSlots(userId: string, bulkCreateDto: BulkCreateTimeSlotsDto): Promise<{
        success: boolean;
        data: {
            count: number;
            dates: number;
            timeRanges: number;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    queryTimeSlots(queryDto: QueryTimeSlotsDto): Promise<{
        success: boolean;
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
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    updateTimeSlot(userId: string, timeSlotId: string, updateTimeSlotDto: UpdateTimeSlotDto): Promise<{
        success: boolean;
        data: {
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
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    deleteTimeSlot(userId: string, timeSlotId: string): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
}
