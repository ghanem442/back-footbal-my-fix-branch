"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./modules/prisma/prisma.module");
const redis_module_1 = require("./modules/redis/redis.module");
const auth_module_1 = require("./modules/auth/auth.module");
const i18n_module_1 = require("./modules/i18n/i18n.module");
const fields_module_1 = require("./modules/fields/fields.module");
const time_slots_module_1 = require("./modules/time-slots/time-slots.module");
const admin_module_1 = require("./modules/admin/admin.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const qr_module_1 = require("./modules/qr/qr.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const logger_module_1 = require("./modules/logger/logger.module");
const payment_module_1 = require("./modules/payments/payment.module");
const storage_module_1 = require("./modules/storage/storage.module");
const email_module_1 = require("./modules/email/email.module");
const health_controller_1 = require("./common/health/health.controller");
const config_module_1 = require("./config/config.module");
const throttler_1 = require("@nestjs/throttler");
const redis_throttler_storage_service_1 = require("./common/throttler/redis-throttler-storage.service");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_behind_proxy_guard_1 = require("./common/guards/throttler-behind-proxy.guard");
const request_logger_middleware_1 = require("./common/middleware/request-logger.middleware");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = __importDefault(require("ioredis"));
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_logger_middleware_1.RequestLoggerMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.AppConfigModule,
            logger_module_1.LoggerModule,
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_module_1.AppConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const isDev = configService.get('NODE_ENV') === 'development';
                    const redis = new ioredis_1.default({
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                        password: configService.get('REDIS_PASSWORD'),
                        db: configService.get('REDIS_THROTTLE_DB', 1),
                    });
                    return {
                        throttlers: [
                            {
                                name: 'default',
                                ttl: isDev ? 60000 : 900000,
                                limit: isDev ? 100 : 100,
                            },
                        ],
                        storage: new redis_throttler_storage_service_1.RedisThrottlerStorageService(redis),
                        skipIf: () => isDev,
                    };
                },
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            i18n_module_1.I18nModule,
            fields_module_1.FieldsModule,
            time_slots_module_1.TimeSlotsModule,
            admin_module_1.AdminModule,
            bookings_module_1.BookingsModule,
            payment_module_1.PaymentModule,
            wallet_module_1.WalletModule,
            qr_module_1.QrModule,
            notifications_module_1.NotificationsModule,
            reviews_module_1.ReviewsModule,
            storage_module_1.StorageModule,
            email_module_1.EmailModule,
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_behind_proxy_guard_1.ThrottlerBehindProxyGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map