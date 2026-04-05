"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottlerBehindProxyGuard = void 0;
const throttler_1 = require("@nestjs/throttler");
const common_1 = require("@nestjs/common");
let ThrottlerBehindProxyGuard = class ThrottlerBehindProxyGuard extends throttler_1.ThrottlerGuard {
    async canActivate(context) {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            return true;
        }
        return super.canActivate(context);
    }
    async getTracker(req) {
        return req.ips?.length ? req.ips[0] : req.ip || req.socket?.remoteAddress || 'unknown';
    }
    async getThrottlerSuffix(context, throttlerName) {
        const request = context.switchToHttp().getRequest();
        const tracker = await this.getTracker(request);
        return `${tracker}-${throttlerName}`;
    }
};
exports.ThrottlerBehindProxyGuard = ThrottlerBehindProxyGuard;
exports.ThrottlerBehindProxyGuard = ThrottlerBehindProxyGuard = __decorate([
    (0, common_1.Injectable)()
], ThrottlerBehindProxyGuard);
//# sourceMappingURL=throttler-behind-proxy.guard.js.map