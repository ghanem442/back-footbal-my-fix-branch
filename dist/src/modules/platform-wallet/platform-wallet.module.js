"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformWalletModule = void 0;
const common_1 = require("@nestjs/common");
const platform_wallet_service_1 = require("./platform-wallet.service");
const prisma_module_1 = require("../prisma/prisma.module");
let PlatformWalletModule = class PlatformWalletModule {
};
exports.PlatformWalletModule = PlatformWalletModule;
exports.PlatformWalletModule = PlatformWalletModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [platform_wallet_service_1.PlatformWalletService],
        exports: [platform_wallet_service_1.PlatformWalletService],
    })
], PlatformWalletModule);
//# sourceMappingURL=platform-wallet.module.js.map