export declare enum ReportType {
    REVENUE = "revenue",
    BOOKINGS = "bookings",
    USERS = "users",
    FIELDS = "fields"
}
export declare class ExportReportDto {
    reportType: ReportType;
    startDate: string;
    endDate: string;
}
