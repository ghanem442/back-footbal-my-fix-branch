"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const bilingual_exception_filter_1 = require("./common/filters/bilingual-exception.filter");
const i18n_validation_pipe_1 = require("./common/pipes/i18n-validation.pipe");
const bilingual_response_interceptor_1 = require("./common/interceptors/bilingual-response.interceptor");
const rate_limit_headers_interceptor_1 = require("./common/interceptors/rate-limit-headers.interceptor");
const nestjs_i18n_1 = require("nestjs-i18n");
const helmet_1 = __importDefault(require("helmet"));
const swagger_1 = require("@nestjs/swagger");
function getAllowedOrigins() {
    const raw = process.env.ALLOWED_ORIGINS ?? '';
    const fromEnv = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const defaults = ['http://localhost:3000', 'http://localhost:5173'];
    return Array.from(new Set([...fromEnv, ...defaults]));
}
function isLocalhostOrigin(origin) {
    return (/^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin));
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)({
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
        noSniff: true,
        frameguard: { action: 'deny' },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
    }));
    const allowedOrigins = getAllowedOrigins();
    console.log('🌐 CORS allowed origins:', allowedOrigins);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (isLocalhostOrigin(origin))
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error(`CORS blocked for origin: ${origin}`), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
        exposedHeaders: [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
        ],
        maxAge: 86400,
    });
    app.setGlobalPrefix('api/v1', {
        exclude: ['health'],
    });
    app.useStaticAssets('uploads', {
        prefix: '/uploads/',
    });
    const i18nService = app.get(nestjs_i18n_1.I18nService);
    app.useGlobalFilters(new bilingual_exception_filter_1.BilingualExceptionFilter(i18nService));
    app.useGlobalPipes(new i18n_validation_pipe_1.I18nValidationPipe());
    app.useGlobalInterceptors(new bilingual_response_interceptor_1.BilingualResponseInterceptor(), new rate_limit_headers_interceptor_1.RateLimitHeadersInterceptor());
    const enableSwagger = process.env.ENABLE_SWAGGER !== 'false';
    if (enableSwagger) {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Football Field Booking API')
            .setDescription('Football Field Booking API')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            in: 'header',
        }, 'JWT-auth')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
        console.log('📚 Swagger: http://localhost:3000/api/docs');
    }
    const host = '0.0.0.0';
    const port = process.env.PORT || 3000;
    await app.listen(port, host);
    app.enableShutdownHooks();
    console.log(`🚀 Server is running on http://${host}:${port}`);
    console.log(`📱 Access from mobile: http://<YOUR_LAN_IP>:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map