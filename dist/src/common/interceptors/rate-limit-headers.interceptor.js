"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitHeadersInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let RateLimitHeadersInterceptor = class RateLimitHeadersInterceptor {
    intercept(context, next) {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();
        return next.handle().pipe((0, operators_1.tap)(() => {
            if (request.rateLimit) {
                response.setHeader('X-RateLimit-Limit', request.rateLimit.limit);
                response.setHeader('X-RateLimit-Remaining', request.rateLimit.remaining);
                response.setHeader('X-RateLimit-Reset', request.rateLimit.reset);
            }
        }));
    }
};
exports.RateLimitHeadersInterceptor = RateLimitHeadersInterceptor;
exports.RateLimitHeadersInterceptor = RateLimitHeadersInterceptor = __decorate([
    (0, common_1.Injectable)()
], RateLimitHeadersInterceptor);
//# sourceMappingURL=rate-limit-headers.interceptor.js.map