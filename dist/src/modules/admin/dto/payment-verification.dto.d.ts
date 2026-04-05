export declare class RejectPaymentDto {
    reason: string;
}
export declare class ListPendingPaymentsDto {
    page?: number;
    limit?: number;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
}
