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
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    get nodeEnv() {
        return this.configService.get('app.nodeEnv', 'development');
    }
    get port() {
        return this.configService.get('app.port', 3000);
    }
    get appName() {
        return this.configService.get('app.name', 'Football Field Booking API');
    }
    get databaseUrl() {
        return this.configService.get('database.url');
    }
    get redisHost() {
        return this.configService.get('redis.host', 'localhost');
    }
    get redisPort() {
        return this.configService.get('redis.port', 6379);
    }
    get redisPassword() {
        return this.configService.get('redis.password');
    }
    get redisDb() {
        return this.configService.get('redis.db', 0);
    }
    get jwtSecret() {
        return this.configService.get('jwt.secret');
    }
    get jwtRefreshSecret() {
        return this.configService.get('jwt.refreshSecret');
    }
    get jwtAccessExpiration() {
        return this.configService.get('jwt.accessExpiration', '15m');
    }
    get jwtRefreshExpiration() {
        return this.configService.get('jwt.refreshExpiration', '7d');
    }
    get(key) {
        return this.configService.get(key);
    }
    get depositPercentage() {
        return this.configService.get('system.depositPercentage', 20);
    }
    get globalCommissionRate() {
        return this.configService.get('system.globalCommissionRate', 10);
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=config.service.js.map