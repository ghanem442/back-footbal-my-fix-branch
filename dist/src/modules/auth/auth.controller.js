"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
const prisma_service_1 = require("../prisma/prisma.service");
const register_dto_1 = require("../users/dto/register.dto");
const login_dto_1 = require("../users/dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const resend_verification_dto_1 = require("./dto/resend-verification.dto");
const rate_limit_guard_1 = require("../../common/guards/rate-limit.guard");
const rate_limit_decorator_1 = require("../../common/decorators/rate-limit.decorator");
const auth_logger_service_1 = require("../../common/services/auth-logger.service");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const public_decorator_1 = require("./decorators/public.decorator");
const google_oauth_guard_1 = require("./guards/google-oauth.guard");
const facebook_oauth_guard_1 = require("./guards/facebook-oauth.guard");
const throttler_1 = require("@nestjs/throttler");
let AuthController = class AuthController {
    constructor(authService, usersService, authLogger, prisma) {
        this.authService = authService;
        this.usersService = usersService;
        this.authLogger = authLogger;
        this.prisma = prisma;
    }
    async register(registerDto) {
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
        try {
            console.log('🔄 Step 1: Creating user...');
            const user = await this.usersService.createUser(registerDto.email, registerDto.password, registerDto.role, registerDto.name);
            console.log('✅ User created successfully:', {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            });
            console.log('🔄 Step 2: Generating auth tokens...');
            const tokens = await this.authService.generateTokenPair(user.id, user.email, user.role);
            console.log('✅ Auth tokens generated');
            console.log('🔄 Step 3: Generating email verification token...');
            let verificationToken = null;
            try {
                verificationToken = await this.authService.generateEmailVerificationToken(user.id, user.email);
                console.log('✅ Verification token generated');
            }
            catch (emailError) {
                console.error('⚠️ Failed to generate/send verification email:', emailError);
                console.error('Email error details:', {
                    type: emailError instanceof Error ? emailError.constructor.name : typeof emailError,
                    message: emailError instanceof Error ? emailError.message : String(emailError),
                    stack: emailError instanceof Error ? emailError.stack : undefined,
                });
            }
            const response = {
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
        }
        catch (error) {
            console.log('\n========================================');
            console.log('❌ REGISTRATION FAILED');
            console.log('========================================');
            console.log('Timestamp:', new Date().toISOString());
            console.log('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
            console.log('Error Message:', error instanceof Error ? error.message : String(error));
            console.log('Error Code:', error.code || 'N/A');
            console.log('Error Status:', error.status || error.statusCode || 'N/A');
            console.log('Error Response:', JSON.stringify(error.response || {}, null, 2));
            console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
            console.log('========================================\n');
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException({
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
    async login(loginDto, request) {
        const ipAddress = this.getClientIp(request);
        const userAgent = request.headers['user-agent'];
        console.log('\n========================================');
        console.log('🔐 LOGIN REQUEST RECEIVED');
        console.log('========================================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Email:', loginDto.email);
        console.log('Password Length:', loginDto.password?.length || 0);
        console.log('IP Address:', ipAddress);
        console.log('User Agent:', userAgent);
        console.log('========================================\n');
        try {
            console.log('🔄 Step 1: Validating credentials...');
            const user = await this.authService.validateCredentials(loginDto.email, loginDto.password);
            console.log('✅ Credentials validated for user:', {
                id: user.id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            });
            console.log('🔄 Step 2: Generating tokens...');
            const tokens = await this.authService.generateTokenPair(user.id, user.email, user.role);
            console.log('✅ Tokens generated');
            console.log('🔄 Step 3: Logging successful login...');
            try {
                await this.authLogger.logSuccessfulLogin(user.id, user.email, ipAddress, userAgent);
                console.log('✅ Login logged');
            }
            catch (logError) {
                console.error('⚠️ Failed to log successful login:', logError);
                console.error('Logger error details:', {
                    type: logError instanceof Error ? logError.constructor.name : typeof logError,
                    message: logError instanceof Error ? logError.message : String(logError),
                });
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
        }
        catch (error) {
            console.log('\n========================================');
            console.log('❌ LOGIN FAILED');
            console.log('========================================');
            console.log('Timestamp:', new Date().toISOString());
            console.log('Email:', loginDto.email);
            console.log('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
            console.log('Error Message:', error instanceof Error ? error.message : String(error));
            console.log('Error Code:', error.code || 'N/A');
            console.log('Error Status:', error.status || error.statusCode || 'N/A');
            console.log('Error Stack:', error instanceof Error ? error.stack : 'N/A');
            console.log('========================================\n');
            try {
                await this.authLogger.logFailedLogin(loginDto.email, ipAddress, error instanceof Error ? error.message : 'Unknown error', userAgent);
            }
            catch (logError) {
                console.error('⚠️ Failed to log failed login:', logError);
                console.error('Logger error details:', {
                    type: logError instanceof Error ? logError.constructor.name : typeof logError,
                    message: logError instanceof Error ? logError.message : String(logError),
                });
            }
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException({
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
    getClientIp(request) {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
            return ips.split(',')[0].trim();
        }
        return request.ip || request.socket.remoteAddress || 'unknown';
    }
    async refresh(refreshTokenDto) {
        const tokens = await this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
        return {
            success: true,
            data: {
                tokens,
            },
            message: 'Tokens refreshed successfully',
        };
    }
    async logout(user, request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return {
                success: true,
                message: 'Logged out successfully',
            };
        }
        const accessToken = authHeader.replace('Bearer ', '');
        await this.authService.logout(accessToken, user.userId);
        return {
            success: true,
            message: 'Logged out successfully',
        };
    }
    async forgotPassword(forgotPasswordDto) {
        await this.authService.generatePasswordResetToken(forgotPasswordDto.email);
        return {
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent',
        };
    }
    async resetPassword(resetPasswordDto) {
        await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
        return {
            success: true,
            message: 'Password has been reset successfully',
        };
    }
    async verifyEmail(verifyEmailDto) {
        await this.authService.verifyEmail(verifyEmailDto.token);
        return {
            success: true,
            message: 'Email verified successfully. You can now login.',
        };
    }
    async verifyEmailViaLink(token, response) {
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
        }
        catch (error) {
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
    async resendVerification(resendVerificationDto) {
        await this.authService.resendEmailVerification(resendVerificationDto.email);
        return {
            success: true,
            message: 'If an unverified account exists with this email, a verification link has been sent',
        };
    }
    async devAutoVerify(email) {
        if (process.env.NODE_ENV !== 'development') {
            throw new common_1.BadRequestException('This endpoint is only available in development mode');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        await this.usersService.markAsVerified(user.id);
        return {
            success: true,
            message: `[DEV] Email ${email} has been auto-verified`,
        };
    }
    async googleAuth() {
    }
    async googleAuthCallback(request, response) {
        try {
            const { user, tokens } = await this.authService.handleOAuthUser(request.user.id, request.user.email, 'GOOGLE');
            const ipAddress = this.getClientIp(request);
            const userAgent = request.headers['user-agent'];
            await this.authLogger.logSuccessfulLogin(user.id, user.email, ipAddress, userAgent);
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
        }
        catch (error) {
            const ipAddress = this.getClientIp(request);
            const userAgent = request.headers['user-agent'];
            await this.authLogger.logFailedLogin(request.user?.email || 'unknown', ipAddress, error instanceof Error ? error.message : 'OAuth authentication failed', userAgent);
            response.status(common_1.HttpStatus.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: 'OAUTH_ERROR',
                    message: error instanceof Error ? error.message : 'OAuth authentication failed',
                },
            });
        }
    }
    async facebookAuth() {
    }
    async facebookAuthCallback(request, response) {
        try {
            const { user, tokens } = await this.authService.handleOAuthUser(request.user.id, request.user.email, 'FACEBOOK');
            const ipAddress = this.getClientIp(request);
            const userAgent = request.headers['user-agent'];
            await this.authLogger.logSuccessfulLogin(user.id, user.email, ipAddress, userAgent);
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
        }
        catch (error) {
            const ipAddress = this.getClientIp(request);
            const userAgent = request.headers['user-agent'];
            await this.authLogger.logFailedLogin(request.user?.email || 'unknown', ipAddress, error instanceof Error ? error.message : 'OAuth authentication failed', userAgent);
            response.status(common_1.HttpStatus.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: 'OAUTH_ERROR',
                    message: error instanceof Error ? error.message : 'OAuth authentication failed',
                },
            });
        }
    }
    async updateMe(userId, body) {
        if (!body.email && !body.name) {
            throw new common_1.BadRequestException('At least one field (email or name) is required');
        }
        if (body.email) {
            const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
            if (existing && existing.id !== userId) {
                throw new common_1.BadRequestException({
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
    async changePassword(userId, body) {
        if (!body.currentPassword || !body.newPassword) {
            throw new common_1.BadRequestException('currentPassword and newPassword are required');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash) {
            throw new common_1.BadRequestException('User not found or no password set');
        }
        const isValid = await this.usersService.verifyPassword(body.currentPassword, user.passwordHash);
        if (!isValid) {
            throw new common_1.BadRequestException({
                code: 'INVALID_CURRENT_PASSWORD',
                message: { en: 'Current password is incorrect', ar: 'كلمة المرور الحالية غير صحيحة' },
            });
        }
        const newHash = await this.usersService.hashPassword(body.newPassword);
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
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Register a new user',
        description: 'Create a new user account with email and password. Returns user details and JWT tokens.',
    }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, rate_limit_decorator_1.RateLimit)({ ttl: 900, limit: 5 }),
    (0, swagger_1.ApiOperation)({
        summary: 'User login',
        description: 'Authenticate user with email and password. Returns user details and JWT tokens. Rate limited to 5 attempts per 15 minutes.',
    }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Refresh access token',
        description: 'Generate a new access token using a valid refresh token. Returns new token pair.',
    }),
    (0, swagger_1.ApiBody)({ type: refresh_token_dto_1.RefreshTokenDto }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'User logout',
        description: 'Logout user by blacklisting access token and revoking all refresh tokens. Requires authentication.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Logged out successfully',
        schema: {
            example: {
                success: true,
                message: 'Logged out successfully',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, rate_limit_decorator_1.RateLimit)({ ttl: 900, limit: 3 }),
    (0, swagger_1.ApiOperation)({
        summary: 'Request password reset',
        description: 'Generate and send password reset token via email. Always returns success to prevent email enumeration. Rate limited to 3 attempts per 15 minutes.',
    }),
    (0, swagger_1.ApiBody)({ type: forgot_password_dto_1.ForgotPasswordDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset email sent (if account exists)',
        schema: {
            example: {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 429,
        description: 'Too many password reset attempts',
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Reset password',
        description: 'Reset user password using the token received via email. Token is single-use and expires after 1 hour.',
    }),
    (0, swagger_1.ApiBody)({ type: reset_password_dto_1.ResetPasswordDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Password reset successfully',
        schema: {
            example: {
                success: true,
                message: 'Password has been reset successfully',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify email address',
        description: 'Verify user email address using the token received via email. Token is single-use and expires after 24 hours.',
    }),
    (0, swagger_1.ApiBody)({ type: verify_email_dto_1.VerifyEmailDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email verified successfully',
        schema: {
            example: {
                success: true,
                message: 'Email verified successfully. You can now login.',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid or expired verification token',
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify email via link (GET)',
        description: 'Verify email address by clicking link in email. This endpoint accepts token as query parameter.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'token',
        description: 'Email verification token from email',
        example: 'abc123...',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Email verified successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid or expired token',
    }),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmailViaLink", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, rate_limit_decorator_1.RateLimit)({ ttl: 900, limit: 3 }),
    (0, swagger_1.ApiOperation)({
        summary: 'Resend email verification',
        description: 'Resend email verification link. Rate limited to 3 attempts per 15 minutes.',
    }),
    (0, swagger_1.ApiBody)({ type: resend_verification_dto_1.ResendVerificationDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Verification email sent (if account exists and is not verified)',
        schema: {
            example: {
                success: true,
                message: 'If an unverified account exists with this email, a verification link has been sent',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 429,
        description: 'Too many resend attempts',
    }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [resend_verification_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('dev/auto-verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '[DEV ONLY] Auto-verify email',
        description: 'Automatically verify user email without token. Only works in development mode.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'player@test.com' },
            },
        },
    }),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "devAutoVerify", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuthCallback", null);
__decorate([
    (0, common_1.Get)('facebook'),
    (0, common_1.UseGuards)(facebook_oauth_guard_1.FacebookOAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebookAuth", null);
__decorate([
    (0, common_1.Get)('facebook/callback'),
    (0, common_1.UseGuards)(facebook_oauth_guard_1.FacebookOAuthGuard),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebookAuthCallback", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user email or name' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Change current user password' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService,
        auth_logger_service_1.AuthLoggerService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map