import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BilingualExceptionFilter } from '@common/filters/bilingual-exception.filter';
import { I18nValidationPipe } from '@common/pipes/i18n-validation.pipe';
import { BilingualResponseInterceptor } from '@common/interceptors/bilingual-response.interceptor';
import { RateLimitHeadersInterceptor } from '@common/interceptors/rate-limit-headers.interceptor';
import { I18nService } from 'nestjs-i18n';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // هنسيبها موجودة
  const defaults = ['http://localhost:3000', 'http://localhost:5173'];

  return Array.from(new Set([...fromEnv, ...defaults]));
}

function isLocalhostOrigin(origin: string) {
  // Allow ANY localhost port for Flutter web dev server
  return (
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  app.use(
    helmet({
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
    }),
  );

  const allowedOrigins = getAllowedOrigins();
  console.log('🌐 CORS allowed origins:', allowedOrigins);

  app.enableCors({
    origin: '*',
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

  // Serve static files from uploads directory
  app.useStaticAssets('uploads', {
    prefix: '/uploads/',
  });

  const i18nService = app.get(I18nService) as I18nService<Record<string, unknown>>;
  app.useGlobalFilters(new BilingualExceptionFilter(i18nService));
  app.useGlobalPipes(new I18nValidationPipe());
  app.useGlobalInterceptors(
    new BilingualResponseInterceptor(),
    new RateLimitHeadersInterceptor(),
  );

  const enableSwagger = process.env.ENABLE_SWAGGER !== 'false';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Football Field Booking API')
      .setDescription('Football Field Booking API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
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