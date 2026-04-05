/**
 * Example usage of RolesGuard and @Roles decorator
 * 
 * This file demonstrates how to use role-based access control in controllers
 */

import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';

/**
 * Example 1: Protecting a single endpoint with a specific role
 */
@Controller('example')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply both guards at controller level
export class ExampleController {
  
  /**
   * Only Players can access this endpoint
   * Field_Owners and Admins can also access due to role hierarchy
   */
  @Get('player-only')
  @Roles(Role.PLAYER)
  getPlayerData() {
    return { message: 'This is accessible by Player, Field_Owner, and Admin' };
  }

  /**
   * Only Field_Owners can access this endpoint
   * Admins can also access due to role hierarchy
   * Players CANNOT access
   */
  @Post('field-owner-only')
  @Roles(Role.FIELD_OWNER)
  createField() {
    return { message: 'This is accessible by Field_Owner and Admin only' };
  }

  /**
   * Only Admins can access this endpoint
   * Field_Owners and Players CANNOT access
   */
  @Get('admin-only')
  @Roles(Role.ADMIN)
  getAdminData() {
    return { message: 'This is accessible by Admin only' };
  }

  /**
   * Multiple roles can be specified
   * This endpoint is accessible by Field_Owner and Admin
   * Players CANNOT access
   */
  @Get('owner-or-admin')
  @Roles(Role.FIELD_OWNER, Role.ADMIN)
  getOwnerOrAdminData() {
    return { message: 'This is accessible by Field_Owner and Admin' };
  }

  /**
   * No @Roles decorator means any authenticated user can access
   */
  @Get('authenticated')
  getAuthenticatedData() {
    return { message: 'Any authenticated user can access this' };
  }
}

/**
 * Example 2: Applying guards at method level instead of controller level
 */
@Controller('example2')
export class Example2Controller {
  
  /**
   * Apply guards at method level for more granular control
   */
  @Get('admin-endpoint')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnlyEndpoint() {
    return { message: 'Admin only' };
  }

  /**
   * This endpoint has no guards, so it's public
   */
  @Get('public')
  publicEndpoint() {
    return { message: 'Public endpoint' };
  }
}

/**
 * Example 3: Role hierarchy demonstration
 * 
 * Role Hierarchy: Admin > Field_Owner > Player
 * 
 * - Admin can access ALL endpoints (Player, Field_Owner, and Admin endpoints)
 * - Field_Owner can access Field_Owner and Player endpoints
 * - Player can ONLY access Player endpoints
 * 
 * Examples:
 * - @Roles(Role.PLAYER) → Accessible by: Player, Field_Owner, Admin
 * - @Roles(Role.FIELD_OWNER) → Accessible by: Field_Owner, Admin
 * - @Roles(Role.ADMIN) → Accessible by: Admin only
 */

/**
 * Example 4: Getting current user in controller
 */
@Controller('example3')
@UseGuards(JwtAuthGuard, RolesGuard)
export class Example3Controller {
  
  @Get('current-user')
  @Roles(Role.PLAYER)
  getCurrentUser(@CurrentUser() user: JwtPayload) {
    // user object contains: userId, email, role
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
  }
}

// Import for CurrentUser decorator
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
