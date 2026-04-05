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
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const redis_1 = require("redis");
const config_service_1 = require("../../config/config.service");
let RedisService = class RedisService {
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        const redisConfig = {
            socket: {
                host: this.configService.redisHost,
                port: this.configService.redisPort,
            },
            password: this.configService.redisPassword,
            database: this.configService.redisDb,
        };
        this.cacheClient = (0, redis_1.createClient)(redisConfig);
        await this.cacheClient.connect();
        this.queueClient = (0, redis_1.createClient)(redisConfig);
        await this.queueClient.connect();
    }
    async onModuleDestroy() {
        await this.cacheClient.quit();
        await this.queueClient.quit();
    }
    getCacheClient() {
        return this.cacheClient;
    }
    getQueueClient() {
        return this.queueClient;
    }
    async healthCheck() {
        try {
            await this.cacheClient.ping();
            await this.queueClient.ping();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    getConnectionOptions() {
        return {
            host: this.configService.redisHost,
            port: this.configService.redisPort,
            password: this.configService.redisPassword,
            db: this.configService.redisDb,
        };
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map