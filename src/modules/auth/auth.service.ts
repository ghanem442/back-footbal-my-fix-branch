import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '@config/config.service';
import { JwtPayload, RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import { TokenPair } from './interfaces/tokens.interface';
import { randomUUID, randomBytes } from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { User } from '@prisma/client';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RedisService } from '@modules/redis/redis.service';
import { EmailService } from '@modules/email/email.service';
import { OtpService } from '@modules/otp/otp.service';
import { TokenHasher } from './utils/token-hasher.util';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: AppConfigService,
    private usersService: UsersService,
    private prisma: PrismaService,
    private redisService: RedisService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {}

  /**
   * Generate access token with 15-minute expiration
   */
  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: '15m',
    });
  }

  /**
   * Generate refresh token with 7-day expiration
   */
  generateRefreshToken(userId: string, familyId?: string): string {
    const tokenId = randomUUID();
    const payload: RefreshTokenPayload = {
      userId,
      tokenId,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: '7d',
    });
  }

  /**
   * Generate both access and refresh tokens
   * Creates a new refresh token family
   */
  async generateTokenPair(
    userId: string,
    email: string,
    role: 'PLAYER' | 'FIELD_OWNER' | 'ADMIN',
  ): Promise<TokenPair> {
    const accessTokenPayload: JwtPayload = {
      userId,
      email,
      role,
    };

    const accessToken = this.generateAccessToken(accessTokenPayload);
    
    // Generate refresh token with new family ID
    const familyId = randomUUID();
    const tokenId = randomUUID();
    const refreshToken = this.jwtService.sign(
      { userId, tokenId } as RefreshTokenPayload,
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: '7d',
      },
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenId,
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get('jwt.secret'),
    });
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.configService.get('jwt.refreshSecret'),
    });
  }

  /**
   * Decode token without verification (for debugging/logging)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Validate user credentials and return user if valid
   * @throws UnauthorizedException if credentials are invalid
   */
  async validateCredentials(email: string, password: string): Promise<User> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: {
          en: 'Invalid email or password',
          ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
      });
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.passwordHash) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: {
          en: 'Invalid email or password',
          ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
      });
    }

    // Verify password
    const isPasswordValid = await this.usersService.verifyPassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: {
          en: 'Invalid email or password',
          ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
      });
    }

    return user;
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation for security
   * @throws UnauthorizedException if refresh token is invalid or revoked
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token signature and expiration
      const payload = await this.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenId: payload.tokenId },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is revoked
      if (storedToken.isRevoked) {
        // Token theft detected - revoke entire family
        await this.revokeTokenFamily(storedToken.familyId);
        throw new UnauthorizedException('Token theft detected. All tokens in family revoked.');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old refresh token
      const newTokenId = randomUUID();
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          replacedBy: newTokenId,
        },
      });

      // Generate new token pair with same family ID (token rotation)
      const user = storedToken.user;
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const newRefreshToken = this.jwtService.sign(
        { userId: user.id, tokenId: newTokenId } as RefreshTokenPayload,
        {
          secret: this.configService.get('jwt.refreshSecret'),
          expiresIn: '7d',
        },
      );

      // Store new refresh token with same family ID
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenId: newTokenId,
          familyId: storedToken.familyId, // Same family for rotation
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revoke all tokens in a token family (used when token theft is detected)
   */
  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke a specific refresh token (used for logout)
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired refresh tokens (should be called periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Logout user by blacklisting access token and revoking refresh tokens
   * @param accessToken - The access token to blacklist
   * @param userId - The user ID to revoke all refresh tokens for
   */
  async logout(accessToken: string, userId: string): Promise<void> {
    try {
      // Verify and decode the access token to get expiration
      const payload = await this.verifyAccessToken(accessToken);

      // Calculate TTL for Redis (time until token expires)
      const decoded = this.jwtService.decode(accessToken) as any;
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const ttl = Math.max(0, Math.floor((expiresAt - now) / 1000)); // TTL in seconds

      // Blacklist the access token in Redis with TTL
      if (ttl > 0) {
        const cacheClient = this.redisService.getCacheClient();
        await cacheClient.setEx(
          `blacklist:${accessToken}`,
          ttl,
          'revoked',
        );
      }

      // Revoke all refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    } catch (error) {
      // If token is already invalid/expired, still revoke refresh tokens
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    }
  }

  /**
   * Check if an access token is blacklisted
   * @param token - The access token to check
   * @returns true if token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const cacheClient = this.redisService.getCacheClient();
      const result = await cacheClient.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      // If Redis is down, fail open (allow the request)
      // This prevents Redis outages from blocking all authenticated requests
      return false;
    }
  }

  /**
   * Check if a user has been blacklisted (e.g., due to role change)
   * @param userId - The user ID to check
   * @returns true if user is blacklisted, false otherwise
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    try {
      const cacheClient = this.redisService.getCacheClient();
      const result = await cacheClient.get(`user:blacklist:${userId}`);
      return result !== null;
    } catch (error) {
      // If Redis is down, fail open (allow the request)
      // This prevents Redis outages from blocking all authenticated requests
      return false;
    }
  }

  /**
   * Generate a secure password reset token
   * @param email - User's email address
   * @throws UnauthorizedException if user not found
   */
  async generatePasswordResetToken(email: string): Promise<void> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      // Just return silently
      return;
    }

    // Generate secure token (plain text to send, hashed to store)
    const { plainToken, hashedToken } = TokenHasher.generateAndHashToken(32);

    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing unused password reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    // Store hashed token in database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send reset email with plain token
    await this.emailService.sendPasswordResetEmail(email, plainToken);
  }

  /**
   * Reset user password using reset token
   * @param token - Password reset token
   * @param newPassword - New password to set
   * @throws UnauthorizedException if token is invalid, expired, or already used
   */
  async resetPassword(plainToken: string, newPassword: string): Promise<void> {
    // Hash the received token to compare with stored hash
    const hashedToken = TokenHasher.hashToken(plainToken);

    // Find token in database
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Check if token is already used
    if (resetToken.isUsed) {
      throw new UnauthorizedException('Reset token has already been used');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await this.usersService.hashPassword(newPassword);

    // Update user password and mark token as used in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
    ]);

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: resetToken.userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    // Send confirmation email
    await this.emailService.sendPasswordResetConfirmation(resetToken.user.email);
  }

  /**
   * Clean up expired password reset tokens (should be called periodically)
   */
  async cleanupExpiredPasswordResetTokens(): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Handle OAuth user authentication (Google/Facebook)
   * Creates new user or links existing account
   * @param oauthId - OAuth provider user ID
   * @param email - User's email from OAuth provider
   * @param provider - OAuth provider (GOOGLE or FACEBOOK)
   * @returns User and token pair
   */
  async handleOAuthUser(
    oauthId: string,
    email: string,
    provider: 'GOOGLE' | 'FACEBOOK',
  ): Promise<{ user: User; tokens: TokenPair }> {
    // Check if user exists with this OAuth ID and provider
    let user = await this.prisma.user.findFirst({
      where: {
        oauthId,
        authProvider: provider,
      },
    });

    if (user) {
      // User exists, generate tokens
      const tokens = await this.generateTokenPair(user.id, user.email, user.role);
      return { user, tokens };
    }

    // Check if user exists with this email but different provider
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Email exists with different provider
      // Link OAuth account to existing user
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          oauthId,
          authProvider: provider,
          isVerified: true, // OAuth accounts are pre-verified
        },
      });

      const tokens = await this.generateTokenPair(user.id, user.email, user.role);
      return { user, tokens };
    }

    // Create new user with OAuth provider
    user = await this.prisma.user.create({
      data: {
        email,
        oauthId,
        authProvider: provider,
        role: 'PLAYER', // Default role for OAuth users
        isVerified: true, // OAuth accounts are pre-verified
      },
    });

    // Create wallet for new user
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return { user, tokens };
  }

  /**
   * Generate email verification token and send verification email
   * @param userId - User ID
   * @param email - User email
   * @returns Plain token (only in development)
   */
  async generateEmailVerificationToken(userId: string, email: string): Promise<string | null> {
    // Generate secure token (plain text to send, hashed to store)
    const { plainToken, hashedToken } = TokenHasher.generateAndHashToken(32);

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Invalidate any existing unused verification tokens for this user
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    // Store hashed token in database
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send verification email with plain token
    await this.emailService.sendEmailVerification(email, plainToken);

    // Return plain token only in development
    if (process.env.NODE_ENV === 'development') {
      return plainToken;
    }

    return null;
  }

  /**
   * Verify email using token
   * @param plainToken - Plain text token from email
   */
  async verifyEmail(plainToken: string): Promise<void> {
    // Hash the received token to compare with stored hash
    const hashedToken = TokenHasher.hashToken(plainToken);

    // Find token in database
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // Check if token is already used
    if (verificationToken.isUsed) {
      throw new UnauthorizedException('Verification token has already been used');
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification token has expired');
    }

    // Update user and mark token as used in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Resend email verification
   * @param email - User email
   */
  async resendEmailVerification(email: string): Promise<void> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Check if already verified
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate and send new verification token
    await this.generateEmailVerificationToken(user.id, user.email);
  }

  /**
   * Cleanup expired and used auth tokens (runs daily at midnight)
   * Deletes:
   * - Expired password reset tokens
   * - Expired email verification tokens
   * - Used tokens older than 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredAuthTokens(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Cleanup password reset tokens
      const deletedResetTokens = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } }, // Expired
            { isUsed: true, usedAt: { lt: sevenDaysAgo } }, // Used and older than 7 days
          ],
        },
      });

      // Cleanup email verification tokens
      const deletedVerificationTokens = await this.prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } }, // Expired
            { isUsed: true, usedAt: { lt: sevenDaysAgo } }, // Used and older than 7 days
          ],
        },
      });

      this.logger.log(
        `Token cleanup completed: ${deletedResetTokens.count} password reset tokens, ${deletedVerificationTokens.count} email verification tokens deleted`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token cleanup failed: ${errorMessage}`);
    }
  }

  async sendPasswordResetOtp(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Password reset OTP requested for non-existent email: ${email}`);
      return;
    }
    await this.otpService.createAndSendOtp(user.id, 'EMAIL', email, 'PASSWORD_RESET');
    this.logger.log(`Password reset OTP sent to ${email}`);
  }

  async verifyOtpAndResetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: { en: 'Invalid email or OTP', ar: 'البريد الإلكتروني أو رمز التحقق غير صحيح' },
      });
    }
    await this.otpService.verifyOtp(user.id, otp, 'PASSWORD_RESET');
    await this.usersService.updatePassword(user.id, newPassword);
    
    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    
    this.logger.log(`Password reset successful for user: ${email}`);
  }
}
