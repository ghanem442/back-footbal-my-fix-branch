import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Req,
  Get,
  Patch,
  Res,
  BadRequestException,
  Query,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RegisterDto } from '@modules/users/dto/register.dto';
import { LoginDto } from '@modules/users/dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { TokenPair } from './interfaces/tokens.interface';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { AuthLoggerService } from '@common/services/auth-logger.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { FacebookProfile } from './strategies/facebook.strategy';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private authLogger: AuthLoggerService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email and password. Returns user details and JWT tokens.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'player@example.com',
            role: 'PLAYER',
          },
          tokens: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        message: 'User registered successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or email already exists',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: {
            en: 'Invalid input data',
            ar: 'بيانات إدخال غير صالحة',
          },
          details: [
            {
              field: 'email',
              message: {
                en: 'Email already exists',
                ar: 'البريد الإلكتروني موجود بالفعل',
              },
            },
          ],
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async register(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    registerDto: RegisterDto,
  ): Promise<{
    success: boolean;
    data: {
      user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        isVerified: boolean;
      };
      tokens: TokenPair;
      verificationToken?: string; // Only in development
    };
    message: string;
  }> {
    // ===== REGISTRATION LOGGING START =====
    console.log('\n========================================');
    console.log('📝 REGISTER REQUEST RECEIVED');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(registerDto, null, 2));
    console.log('Email:', registerDto.email);
    console.log('Password Length:', registerDto.password?.length || 0);
    console.log('Role:', registerDto.role || 'undefined (will default to PLAYER)');
    console.log('Role Type:', typeof registerDto.role);
    console.log('Role Value (raw):', JSON.stringify(registerDto.role));
    console.log('========================================\n');
    // ===== REGISTRATION LOGGING END =====

    try {
      // Create user with hashed password
      console.log('🔄 Step 1: Creating user...');
      const user = await this.usersService.createUser(
        registerDto.email,
        registerDto.password,
        registerDto.role,
        registerDto.name,
      );
      console.log('✅ User created successfully:', {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      });

      // Generate access and refresh tokens (allow login before verification)
      console.log('🔄 Step 2: Generating auth tokens...');
      const tokens = await this.authService.generateTokenPair(
        user.id,
        user.email,
        user.role,
      );
      console.log('✅ Auth tokens generated');

      // Generate and send email verification token (non-blocking)
      console.log('🔄 Step 3: Generating email verification token...');
      let verificationToken: string | null = null;
      try {
        verificationToken = await this.authService.generateEmailVerificationToken(user.id, user.email);
        console.log('✅ Verification token generated');
      } catch (emailError) {
        console.error('⚠️ Failed to generate/send verification email:', emailError);
        console.error('Email error details:', {
          type: emailError instanceof Error ? emailError.constructor.name : typeof emailError,
          message: emailError instanceof Error ? emailError.message : String(emailError),
          stack: emailError instanceof Error ? emailError.stack : undefined,
        });
        // Don't fail registration if email fails - user can resend later
      }

      const response: any = {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
          },
          tokens,
        },
        message: 'User registered successfully. Please check your email to verify your account.',
      };

      // In development, include verification token in response
      if (process.env.NODE_ENV === 'development' && verificationToken) {
        response.data.verificationToken = verificationToken;
        response.message += ` [DEV] Verification token: ${verificationToken}`;
      }

      console.log('\n========================================');
      console.log('✅ REGISTRATION SUCCESS');
      console.log('========================================');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Response:', JSON.stringify({
        success: response.success,
        user: response.data.user,
        hasTokens: !!response.data.tokens,
        hasVerificationToken: !!response.data.verificationToken,
      }, null, 2));
      console.log('========================================\n');

      return response;
    } catch (error) {
      console.log('\n========================================');
      console.log('❌ REGISTRATION FAILED');
      console.log('========================================');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.log('Error Message:', error instanceof Error ? error.message : String(error));
      console.log('Error Code:', (error as any).code || 'N/A');
      console.log('Error Status:', (error as any).status || (error as any).statusCode || 'N/A');
      console.log('Error Response:', JSON.stringify((error as any).response || {}, null, 2));
      console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
      console.log('========================================\n');
      
      // Re-throw known HTTP exceptions
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap unknown errors in InternalServerErrorException
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'REGISTRATION_INTERNAL_ERROR',
          message: {
            en: 'Registration failed due to internal server error',
            ar: 'فشل التسجيل بسبب خطأ داخلي في الخادم',
          },
        },
      });
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle() // Skip throttling for login in development
  @UseGuards(RateLimitGuard)
  @RateLimit({ ttl: 900, limit: 5 }) // 5 attempts per 15 minutes
  // @Throttle({ default: { limit: 50, ttl: 60000 } }) // Disabled in dev - controlled by global guard
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns user details and JWT tokens. Rate limited to 5 attempts per 15 minutes.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'player@example.com',
            role: 'PLAYER',
          },
          tokens: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        message: 'Login successful',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: {
            en: 'Invalid email or password',
            ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          },
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: {
            en: 'Too many login attempts. Please try again later.',
            ar: 'محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة لاحقاً.',
          },
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<{
    success: boolean;
    data: {
      user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
        isVerified: boolean;
      };
      tokens: TokenPair;
    };
    message: string;
  }> {
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    // ===== LOGIN LOGGING START =====
    console.log('\n========================================');
    console.log('🔐 LOGIN REQUEST RECEIVED');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Email:', loginDto.email);
    console.log('Password Length:', loginDto.password?.length || 0);
    console.log('IP Address:', ipAddress);
    console.log('User Agent:', userAgent);
    console.log('========================================\n');
    // ===== LOGIN LOGGING END =====

    try {
      // Validate credentials
      console.log('🔄 Step 1: Validating credentials...');
      const user = await this.authService.validateCredentials(
        loginDto.email,
        loginDto.password,
      );
      console.log('✅ Credentials validated for user:', {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      });

      // Generate tokens
      console.log('🔄 Step 2: Generating tokens...');
      const tokens = await this.authService.generateTokenPair(
        user.id,
        user.email,
        user.role,
      );
      console.log('✅ Tokens generated');

      // Log successful authentication (non-blocking)
      console.log('🔄 Step 3: Logging successful login...');
      try {
        await this.authLogger.logSuccessfulLogin(
          user.id,
          user.email,
          ipAddress,
          userAgent,
        );
        console.log('✅ Login logged');
      } catch (logError) {
        console.error('⚠️ Failed to log successful login:', logError);
        console.error('Logger error details:', {
          type: logError instanceof Error ? logError.constructor.name : typeof logError,
          message: logError instanceof Error ? logError.message : String(logError),
        });
        // Don't fail login if logging fails
      }

      console.log('\n========================================');
      console.log('✅ LOGIN SUCCESS');
      console.log('========================================');
      console.log('Timestamp:', new Date().toISOString());
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('========================================\n');

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
          },
          tokens,
        },
        message: user.isVerified
          ? 'Login successful'
          : 'Login successful. Please verify your email to access all features.',
      };
    } catch (error) {
      console.log('\n========================================');
      console.log('❌ LOGIN FAILED');
      console.log('========================================');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Email:', loginDto.email);
      console.log('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.log('Error Message:', error instanceof Error ? error.message : String(error));
      console.log('Error Code:', (error as any).code || 'N/A');
      console.log('Error Status:', (error as any).status || (error as any).statusCode || 'N/A');
      console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
      console.log('========================================\n');

      // Log failed authentication (non-blocking)
      try {
        await this.authLogger.logFailedLogin(
          loginDto.email,
          ipAddress,
          error instanceof Error ? error.message : 'Unknown error',
          userAgent,
        );
      } catch (logError) {
        console.error('⚠️ Failed to log failed login:', logError);
        console.error('Logger error details:', {
          type: logError instanceof Error ? logError.constructor.name : typeof logError,
          message: logError instanceof Error ? logError.message : String(logError),
        });
        // Don't fail the error response if logging fails
      }

      // Re-throw the error to be handled by NestJS exception filters
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap unknown errors in InternalServerErrorException
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AUTH_INTERNAL_ERROR',
          message: {
            en: 'Authentication failed due to internal server error',
            ar: 'فشل المصادقة بسبب خطأ داخلي في الخادم',
          },
        },
      });
    }
  }

  /**
   * Extract client IP address from request
   * Handles proxies and load balancers
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token using a valid refresh token. Returns new token pair.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        data: {
          tokens: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        message: 'Tokens refreshed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: {
            en: 'Invalid or expired refresh token',
            ar: 'رمز التحديث غير صالح أو منتهي الصلاحية',
          },
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async refresh(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{
    success: boolean;
    data: {
      tokens: TokenPair;
    };
    message: string;
  }> {
    // Refresh access token using refresh token
    const tokens = await this.authService.refreshAccessToken(
      refreshTokenDto.refreshToken,
    );

    return {
      success: true,
      data: {
        tokens,
      },
      message: 'Tokens refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user by blacklisting access token and revoking all refresh tokens. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Blacklist access token and revoke all refresh tokens
    await this.authService.logout(accessToken, user.userId);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ttl: 900, limit: 3 }) // 3 attempts per 15 minutes
  // @Throttle({ default: { limit: 20, ttl: 60000 } }) // Disabled in dev - controlled by global guard
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Generate and send password reset token via email. Always returns success to prevent email enumeration. Rate limited to 3 attempts per 15 minutes.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
    schema: {
      example: {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts',
  })
  async forgotPassword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Generate and send password reset token
    await this.authService.generatePasswordResetToken(forgotPasswordDto.email);

    // Always return success to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using the token received via email. Token is single-use and expires after 1 hour.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password has been reset successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: {
            en: 'Invalid or expired reset token',
            ar: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية',
          },
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async resetPassword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Reset password using token
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using the token received via email. Token is single-use and expires after 24 hours.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. You can now login.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.authService.verifyEmail(verifyEmailDto.token);

    return {
      success: true,
      message: 'Email verified successfully. You can now login.',
    };
  }

  @Get('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email via link (GET)',
    description: 'Verify email address by clicking link in email. This endpoint accepts token as query parameter.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token from email',
    example: 'abc123...',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  async verifyEmailViaLink(
    @Query('token') token: string,
    @Res() response: any,
  ): Promise<void> {
    try {
      if (!token) {
        response.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Verification Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
              .error { color: #f44336; font-size: 24px; margin-bottom: 20px; }
              .message { color: #666; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Verification Failed</div>
              <div class="message">Invalid verification link. Please check your email and try again.</div>
            </div>
          </body>
          </html>
        `);
        return;
      }

      await this.authService.verifyEmail(token);

      response.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
            .title { color: #333; font-size: 24px; margin-bottom: 10px; }
            .message { color: #666; font-size: 16px; margin-bottom: 30px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; }
            .button:hover { background: #45a049; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <div class="title">Email Verified Successfully!</div>
            <div class="message">Your email has been verified. You can now login to your account.</div>
            <a href="#" class="button" onclick="window.close(); return false;">Close</a>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      
      response.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Verification Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #f44336; font-size: 48px; margin-bottom: 20px; }
            .title { color: #333; font-size: 24px; margin-bottom: 10px; }
            .message { color: #666; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌</div>
            <div class="title">Verification Failed</div>
            <div class="message">${errorMessage}</div>
            <div class="message" style="margin-top: 20px; font-size: 14px;">The verification link may have expired or already been used.</div>
          </div>
        </body>
        </html>
      `);
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ttl: 900, limit: 3 }) // 3 attempts per 15 minutes
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Resend email verification link. Rate limited to 3 attempts per 15 minutes.',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent (if account exists and is not verified)',
    schema: {
      example: {
        success: true,
        message: 'If an unverified account exists with this email, a verification link has been sent',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many resend attempts',
  })
  async resendVerification(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    resendVerificationDto: ResendVerificationDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.authService.resendEmailVerification(resendVerificationDto.email);

    // Always return success to prevent email enumeration
    return {
      success: true,
      message: 'If an unverified account exists with this email, a verification link has been sent',
    };
  }

  /**
   * DEV ONLY: Auto-verify email without token
   * POST /auth/dev/auto-verify
   */
  @Post('dev/auto-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEV ONLY] Auto-verify email',
    description: 'Automatically verify user email without token. Only works in development mode.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'player@test.com' },
      },
    },
  })
  async devAutoVerify(
    @Body('email') email: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw new BadRequestException('This endpoint is only available in development mode');
    }

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Auto-verify using UsersService
    await this.usersService.markAsVerified(user.id);

    return {
      success: true,
      message: `[DEV] Email ${email} has been auto-verified`,
    };
  }

  /**
   * Google OAuth - Initiate authentication
   * Redirects user to Google consent screen
   */
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuth(): Promise<void> {
    // Guard redirects to Google
  }

  /**
   * Google OAuth - Callback handler
   * Handles the redirect from Google after user consent
   */
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuthCallback(
    @Req() request: Request & { user: GoogleProfile },
    @Res() response: Response,
  ): Promise<void> {
    try {
      // Handle OAuth user (create or link account)
      const { user, tokens } = await this.authService.handleOAuthUser(
        request.user.id,
        request.user.email,
        'GOOGLE',
      );

      // Log successful authentication
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      await this.authLogger.logSuccessfulLogin(
        user.id,
        user.email,
        ipAddress,
        userAgent,
      );

      // Return tokens as JSON response
      // In production, you might want to redirect to frontend with tokens in URL or set cookies
      response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          tokens,
        },
        message: 'Google authentication successful',
      });
    } catch (error) {
      // Log failed authentication
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      await this.authLogger.logFailedLogin(
        request.user?.email || 'unknown',
        ipAddress,
        error instanceof Error ? error.message : 'OAuth authentication failed',
        userAgent,
      );

      // Return error response
      response.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error instanceof Error ? error.message : 'OAuth authentication failed',
        },
      });
    }
  }

  /**
   * Facebook OAuth - Initiate authentication
   * Redirects user to Facebook consent screen
   */
  @Get('facebook')
  @UseGuards(FacebookOAuthGuard)
  @ApiExcludeEndpoint()
  async facebookAuth(): Promise<void> {
    // Guard redirects to Facebook
  }

  /**
   * Facebook OAuth - Callback handler
   * Handles the redirect from Facebook after user consent
   */
  @Get('facebook/callback')
  @UseGuards(FacebookOAuthGuard)
  @ApiExcludeEndpoint()
  async facebookAuthCallback(
    @Req() request: Request & { user: FacebookProfile },
    @Res() response: Response,
  ): Promise<void> {
    try {
      // Handle OAuth user (create or link account)
      const { user, tokens } = await this.authService.handleOAuthUser(
        request.user.id,
        request.user.email,
        'FACEBOOK',
      );

      // Log successful authentication
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      await this.authLogger.logSuccessfulLogin(
        user.id,
        user.email,
        ipAddress,
        userAgent,
      );

      // Return tokens as JSON response
      // In production, you might want to redirect to frontend with tokens in URL or set cookies
      response.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          tokens,
        },
        message: 'Facebook authentication successful',
      });
    } catch (error) {
      // Log failed authentication
      const ipAddress = this.getClientIp(request);
      const userAgent = request.headers['user-agent'];
      await this.authLogger.logFailedLogin(
        request.user?.email || 'unknown',
        ipAddress,
        error instanceof Error ? error.message : 'OAuth authentication failed',
        userAgent,
      );

      // Return error response
      response.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error instanceof Error ? error.message : 'OAuth authentication failed',
        },
      });
    }
  }
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user email or name' })
  async updateMe(
    @CurrentUser('userId') userId: string,
    @Body() body: { email?: string; name?: string },
  ) {
    if (!body.email && !body.name) {
      throw new BadRequestException('At least one field (email or name) is required');
    }

    if (body.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: { en: 'Email already in use', ar: 'البريد الإلكتروني مستخدم بالفعل' },
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.email ? { email: body.email } : {}),
        ...(body.name ? { name: body.name } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isVerified: true },
    });

    // Revoke all refresh tokens when email changes (security)
    if (body.email) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }

    return {
      success: true,
      data: updated,
      message: { en: 'Profile updated successfully', ar: 'تم تحديث الملف الشخصي بنجاح' },
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('User not found or no password set');
    }

    const isValid = await this.usersService.verifyPassword(body.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: { en: 'Current password is incorrect', ar: 'كلمة المرور الحالية غير صحيحة' },
      });
    }

    const newHash = await this.usersService.hashPassword(body.newPassword);

    // Update password and revoke all refresh tokens atomically
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: { en: 'Password changed successfully. Please login again.', ar: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً.' },
    };
  }
}
