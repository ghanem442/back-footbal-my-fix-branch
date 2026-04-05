"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsModule = void 0;
const common_1 = require("@nestjs/common");
const bookings_controller_1 = require("./bookings.controller");
const bookings_service_1 = require("./bookings.service");
const booking_confirmation_service_1 = require("./booking-confirmation.service");
const cancellation_policy_service_1 = require("./cancellation-policy.service");
const prisma_module_1 = require("../prisma/prisma.module");
const wallet_module_1 = require("../wallet/wallet.module");
const qr_module_1 = require("../qr/qr.module");
const notifications_module_1 = require("../notifications/notifications.module");
const platform_wallet_module_1 = require("../platform-wallet/platform-wallet.module");
const bookings_cron_service_1 = require("./bookings-cron.service");
let BookingsModule = class BookingsModule {
};
exports.BookingsModule = BookingsModule;
exports.BookingsModule = BookingsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, wallet_module_1.WalletModule, qr_module_1.QrModule, notifications_module_1.NotificationsModule, platform_wallet_module_1.PlatformWalletModule],
        controllers: [bookings_controller_1.BookingsController],
        providers: [bookings_service_1.BookingsService, booking_confirmation_service_1.BookingConfirmationService, cancellation_policy_service_1.CancellationPolicyService, bookings_cron_service_1.BookingsCronService],
        exports: [bookings_service_1.BookingsService, booking_confirmation_service_1.BookingConfirmationService, cancellation_policy_service_1.CancellationPolicyService],
    })
], BookingsModule);
//# sourceMappingURL=bookings.module.js.map