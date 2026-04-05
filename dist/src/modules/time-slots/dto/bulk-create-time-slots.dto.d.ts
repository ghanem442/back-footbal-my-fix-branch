export declare class TimeRangeDto {
    startTime: string;
    endTime: string;
    price: number;
}
export declare class BulkCreateTimeSlotsDto {
    fieldId: string;
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    timeRanges: TimeRangeDto[];
}
