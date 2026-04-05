export declare const OWNERSHIP_KEY = "ownership";
export declare enum ResourceType {
    FIELD = "field",
    BOOKING = "booking"
}
export interface OwnershipConfig {
    resourceType: ResourceType;
    paramName: string;
}
export declare const CheckOwnership: (config: OwnershipConfig) => import("@nestjs/common").CustomDecorator<string>;
