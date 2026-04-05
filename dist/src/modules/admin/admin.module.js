"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const payment_account_settings_service_1 = require("./payment-account-settings.service");
const payment_verification_service_1 = require("./payment-verification.service");
const payment_audit_log_service_1 = require("./payment-audit-log.service");
const prisma_module_1 = require("../prisma/prisma.module");
const platform_wallet_module_1 = require("../platform-wallet/platform-wallet.module");
const notifications_module_1 = require("../notifications/notifications.module");
const bookings_module_1 = require("../bookings/bookings.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            platform_wallet_module_1.PlatformWalletModule,
            notifications_module_1.NotificationsModule,
            bookings_module_1.BookingsModule,
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [
            admin_service_1.AdminService,
            payment_account_settings_service_1.PaymentAccountSettingsService,
            payment_verification_service_1.PaymentVerificationService,
            payment_audit_log_service_1.PaymentAuditLogService,
        ],
        exports: [
            admin_service_1.AdminService,
            payment_account_settings_service_1.PaymentAccountSettingsService,
            payment_verification_service_1.PaymentVerificationService,
            payment_audit_log_service_1.PaymentAuditLogService,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map