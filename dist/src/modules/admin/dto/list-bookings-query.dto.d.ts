import { BookingStatus } from '@prisma/client';
export declare class ListBookingsQueryDto {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    fieldId?: string;
    ownerId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}
