"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const redis_service_1 = require("../../modules/redis/redis.service");
exports.RATE_LIMIT_KEY = 'rateLimit';
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector, redisService) {
        this.reflector = reflector;
        this.redisService = redisService;
    }
    async canActivate(context) {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            return true;
        }
        const rateLimitOptions = this.reflector.get(exports.RATE_LIMIT_KEY, context.getHandler());
        if (!rateLimitOptions) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const ip = this.getClientIp(request);
        const key = `rate_limit:${request.route.path}:${ip}`;
        const redis = this.redisService.getCacheClient();
        const { ttl, limit } = rateLimitOptions;
        const current = await redis.get(key);
        const count = current ? parseInt(current, 10) : 0;
        if (count >= limit) {
            const ttlSeconds = await redis.ttl(key);
            throw new common_1.HttpException({
                success: false,
                error: {
                    code: 'TOO_MANY_REQUESTS',
                    message: {
                        en: `Too many requests. Please try again in ${ttlSeconds} seconds.`,
                        ar: `عدد كبير جدًا من الطلبات. يرجى المحاولة مرة أخرى بعد ${ttlSeconds} ثانية.`,
                    },
                },
                timestamp: new Date().toISOString(),
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (count === 0) {
            await redis.setEx(key, ttl, '1');
        }
        else {
            await redis.incr(key);
        }
        return true;
    }
    getClientIp(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        redis_service_1.RedisService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map