"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const facebook_strategy_1 = require("./strategies/facebook.strategy");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const google_oauth_guard_1 = require("./guards/google-oauth.guard");
const facebook_oauth_guard_1 = require("./guards/facebook-oauth.guard");
const config_service_1 = require("../../config/config.service");
const users_module_1 = require("../users/users.module");
const redis_module_1 = require("../redis/redis.module");
const email_module_1 = require("../email/email.module");
const rate_limit_guard_1 = require("../../common/guards/rate-limit.guard");
const auth_logger_service_1 = require("../../common/services/auth-logger.service");
const prisma_module_1 = require("../prisma/prisma.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                inject: [config_service_1.AppConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('jwt.secret'),
                    signOptions: {
                        expiresIn: '15m',
                    },
                }),
            }),
            users_module_1.UsersModule,
            redis_module_1.RedisModule,
            email_module_1.EmailModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            google_strategy_1.GoogleStrategy,
            facebook_strategy_1.FacebookStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            google_oauth_guard_1.GoogleOAuthGuard,
            facebook_oauth_guard_1.FacebookOAuthGuard,
            rate_limit_guard_1.RateLimitGuard,
            auth_logger_service_1.AuthLoggerService,
        ],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, passport_1.PassportModule, jwt_1.JwtModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map