export declare enum GroupByPeriod {
    DAY = "day",
    WEEK = "week",
    MONTH = "month"
}
export declare class DateRangeQueryDto {
    startDate: string;
    endDate: string;
    groupBy?: GroupByPeriod;
}
