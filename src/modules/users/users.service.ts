import { Injectable, ConflictException, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RedisService } from '@modules/redis/redis.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '@common/constants/error-codes';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Create a new user with hashed password
   */
  async createUser(
    email: string,
    password: string,
    role: Role = Role.PLAYER,
    name?: string,
  ): Promise<User> {
    try {
      this.logger.log(`Creating user with email: ${email}, role: ${role}`);
      
      // Check if user already exists
      this.logger.log('Checking if user already exists...');
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`User already exists with email: ${email}`);
        throw new HttpException(
          ErrorCodes.EMAIL_ALREADY_EXISTS,
          ErrorCodes.EMAIL_ALREADY_EXISTS.httpStatus,
        );
      }

      // Hash password with bcrypt (12 salt rounds)
      this.logger.log('Hashing password...');
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
      this.logger.log('Password hashed successfully');

      // Create user and wallet in a transaction
      this.logger.log('Creating user and wallet in transaction...');
      const user = await this.prisma.$transaction(async (tx) => {
        this.logger.log('Creating user record...');
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role,
            name,
          },
        });
        this.logger.log(`User created with ID: ${newUser.id}`);

        // Create wallet with zero balance for the new user
        this.logger.log('Creating wallet for user...');
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
          },
        });
        this.logger.log('Wallet created successfully');

        return newUser;
      });

      this.logger.log(`User creation completed successfully for: ${email}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update user profile (name fields stored via phoneNumber + preferredLanguage)
   */
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phoneNumber?: string;
      preferredLanguage?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Mark a user as verified
   */
  async markAsVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { 
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  /**
   * Change user role and invalidate all existing tokens
   * @param userId - User ID to change role for
   * @param newRole - New role to assign
   * @param adminUserId - Admin user ID performing the change
   * @returns Updated user with old and new role
   */
  async changeUserRole(
    userId: string,
    newRole: Role,
    adminUserId: string,
  ): Promise<{ user: User; oldRole: Role; newRole: Role }> {
    // Find user
    const user = await this.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;

    // If role is the same, no need to update
    if (oldRole === newRole) {
      return { user, oldRole, newRole };
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Invalidate all tokens for this user
    await this.invalidateAllUserTokens(userId);

    // Log role change event
    this.logger.log(
      `Role changed for user ${userId} (${user.email}) from ${oldRole} to ${newRole} by admin ${adminUserId}`,
    );

    return {
      user: updatedUser,
      oldRole,
      newRole,
    };
  }

  /**
   * Invalidate all tokens for a user
   * - Revokes all refresh tokens in database
   * - Adds all active access tokens to Redis blacklist
   * @param userId - User ID to invalidate tokens for
   */
  private async invalidateAllUserTokens(userId: string): Promise<void> {
    try {
      // 1. Get all non-revoked refresh tokens for this user
      const activeRefreshTokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          isRevoked: false,
        },
      });

      // 2. Revoke all refresh tokens in database
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

      this.logger.log(
        `Revoked ${activeRefreshTokens.length} refresh tokens for user ${userId}`,
      );

      // 3. Add all active access tokens to Redis blacklist
      // Since we don't store access tokens, we need to blacklist them based on their expiration
      // Access tokens expire in 15 minutes, so we blacklist for 15 minutes
      const cacheClient = this.redisService.getCacheClient();
      const ttl = 15 * 60; // 15 minutes in seconds

      // We'll use a user-level blacklist key that the JWT strategy can check
      // This is more efficient than trying to blacklist individual tokens we don't have
      await cacheClient.setEx(
        `user:blacklist:${userId}`,
        ttl,
        new Date().toISOString(),
      );

      this.logger.log(
        `Added user ${userId} to token blacklist for ${ttl} seconds`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Failed to invalidate tokens for user ${userId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
