import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RegisterDto } from '@modules/users/dto/register.dto';
import { LoginDto } from '@modules/users/dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ForgotPasswordOtpDto } from './dto/forgot-password-otp.dto';
import { VerifyOtpResetPasswordDto } from './dto/verify-otp-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { TokenPair } from './interfaces/tokens.interface';
import { AuthLoggerService } from '@common/services/auth-logger.service';
import { Request, Response } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { GoogleProfile } from './strategies/google.strategy';
import { FacebookProfile } from './strategies/facebook.strategy';
export declare class AuthController {
    private authService;
    private usersService;
    private authLogger;
    private prisma;
    constructor(authService: AuthService, usersService: UsersService, authLogger: AuthLoggerService, prisma: PrismaService);
    register(registerDto: RegisterDto): Promise<{
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
            verificationToken?: string;
        };
        message: string;
    }>;
    login(loginDto: LoginDto, request: Request): Promise<{
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
    }>;
    private getClientIp;
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
        success: boolean;
        data: {
            tokens: TokenPair;
        };
        message: string;
    }>;
    logout(user: JwtPayload, request: Request): Promise<{
        success: boolean;
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyEmailViaLink(token: string, response: any): Promise<void>;
    resendVerification(resendVerificationDto: ResendVerificationDto): Promise<{
        success: boolean;
        message: string;
    }>;
    devAutoVerify(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    googleAuth(): Promise<void>;
    googleAuthCallback(request: Request & {
        user: GoogleProfile;
    }, response: Response): Promise<void>;
    facebookAuth(): Promise<void>;
    facebookAuthCallback(request: Request & {
        user: FacebookProfile;
    }, response: Response): Promise<void>;
    updateMe(userId: string, body: {
        email?: string;
        name?: string;
    }): Promise<{
        success: boolean;
        data: {
            id: string;
            name: string | null;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
        };
        message: {
            en: string;
            ar: string;
        };
    }>;
    changePassword(userId: string, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
    forgotPasswordOtp(dto: ForgotPasswordOtpDto): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
    verifyOtpResetPassword(dto: VerifyOtpResetPasswordDto): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
    }>;
}
