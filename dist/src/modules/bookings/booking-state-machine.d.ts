type AnyBookingStatus = string;
export declare const VALID_TRANSITIONS: Record<AnyBookingStatus, AnyBookingStatus[]>;
export declare function isValidTransition(fromStatus: string, toStatus: string): boolean;
export declare function validateTransition(fromStatus: string, toStatus: string): void;
export declare function getNextStatuses(status: string): string[];
export declare function isTerminalStatus(status: string): boolean;
export {};
