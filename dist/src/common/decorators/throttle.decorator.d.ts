export declare const THROTTLE_KEY = "throttle";
export interface ThrottleOptions {
    limit: number;
    ttl: number;
}
export declare const Throttle: (options: ThrottleOptions) => import("@nestjs/common").CustomDecorator<string>;
export declare const ThrottleAuth: () => import("@nestjs/common").CustomDecorator<string>;
export declare const ThrottlePayment: () => import("@nestjs/common").CustomDecorator<string>;
export declare const ThrottleDefault: () => import("@nestjs/common").CustomDecorator<string>;
