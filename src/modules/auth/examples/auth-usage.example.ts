/**
 * Example usage of the Auth Module
 * 
 * This file demonstrates how to use the authentication module
 * in your controllers and services.
 */

import { Controller, Get, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Example 1: Login endpoint (public route)
@Controller('auth')
export class AuthExampleController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    // Validate credentials (implement your own validation logic)
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token pair
    const tokens = await this.authService.generateTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() refreshDto: { refreshToken: string }) {
    try {
      // Verify refresh token
      const payload = await this.authService.verifyRefreshToken(
        refreshDto.refreshToken,
      );

      // Get user from database (implement your own logic)
      const user = await this.getUserById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new token pair
      const tokens = await this.authService.generateTokenPair(
        user.id,
        user.email,
        user.role,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Helper methods (implement these based on your user service)
  private async validateUser(email: string, password: string): Promise<any> {
    // Implement user validation logic
    return null;
  }

  private async getUserById(userId: string): Promise<any> {
    // Implement user retrieval logic
    return null;
  }
}

// Example 2: Protected route with JWT guard
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileExampleController {
  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
  }

  @Get('details')
  getDetailedProfile(@CurrentUser() user: JwtPayload) {
    // Access specific user properties
    const userId = user.userId;
    const email = user.email;
    const role = user.role;

    return {
      userId,
      email,
      role,
      message: 'This is a protected route',
    };
  }
}

// Example 3: Role-based access (you can create a custom guard for this)
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminExampleController {
  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    // Check if user is admin
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    return {
      message: 'Admin dashboard data',
    };
  }
}

// Example 4: Mixed public and protected routes
@Controller('fields')
export class FieldsExampleController {
  @Public()
  @Get()
  listFields() {
    return {
      message: 'Public list of fields',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createField(@CurrentUser() user: JwtPayload, @Body() fieldDto: any) {
    // Only authenticated users can create fields
    return {
      message: 'Field created',
      ownerId: user.userId,
    };
  }
}
