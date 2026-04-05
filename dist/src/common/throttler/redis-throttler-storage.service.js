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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisThrottlerStorageService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisThrottlerStorageService = class RedisThrottlerStorageService {
    constructor(redis) {
        this.keyPrefix = 'throttle:';
        this.redis = redis;
    }
    async onApplicationShutdown() {
        await this.redis.quit();
    }
    async increment(key, ttl, limit, blockDuration, throttlerName) {
        const fullKey = this.keyPrefix + key;
        const now = Date.now();
        const windowStart = now - ttl * 1000;
        const multi = this.redis.multi();
        multi.zremrangebyscore(fullKey, 0, windowStart);
        multi.zadd(fullKey, now, `${now}`);
        multi.zcount(fullKey, windowStart, now);
        multi.expire(fullKey, ttl);
        const results = await multi.exec();
        if (!results) {
            throw new Error('Redis transaction failed');
        }
        const count = results[2][1];
        const timeToReset = Math.ceil(ttl * 1000);
        return {
            totalHits: count,
            timeToExpire: timeToReset,
            isBlocked: count > limit,
            timeToBlockExpire: count > limit ? blockDuration : 0,
        };
    }
};
exports.RedisThrottlerStorageService = RedisThrottlerStorageService;
exports.RedisThrottlerStorageService = RedisThrottlerStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisThrottlerStorageService);
//# sourceMappingURL=redis-throttler-storage.service.js.map