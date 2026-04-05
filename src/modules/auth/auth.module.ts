import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { AppConfigService } from '@config/config.service';
import { UsersModule } from '@modules/users/users.module';
import { RedisModule } from '@modules/redis/redis.module';
import { EmailModule } from '@modules/email/email.module';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { AuthLoggerService } from '@common/services/auth-logger.service';
import { PrismaModule } from '@modules/prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
    UsersModule,
    RedisModule,
    EmailModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    JwtAuthGuard,
    GoogleOAuthGuard,
    FacebookOAuthGuard,
    RateLimitGuard,
    AuthLoggerService,
  ],
  exports: [AuthService, JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}
