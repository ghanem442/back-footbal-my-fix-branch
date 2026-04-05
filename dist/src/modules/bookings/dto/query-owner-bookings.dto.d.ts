import { BookingStatus } from '@prisma/client';
export declare class QueryOwnerBookingsDto {
    fieldId?: string;
    status?: BookingStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
