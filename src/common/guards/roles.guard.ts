import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Guard that checks if the user has the required role to access a route
 * Implements role hierarchy: Admin > Field_Owner > Player
 * - Admin can access all endpoints
 * - Field_Owner can access Field_Owner and Player endpoints
 * - Player can only access Player endpoints
 */
@Injectable()
export class RolesGuard implements CanActivate {
  // Define role hierarchy levels (higher number = more privileges)
  private readonly roleHierarchy: Record<Role, number> = {
    [Role.PLAYER]: 1,
    [Role.FIELD_OWNER]: 2,
    [Role.ADMIN]: 3,
  };

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // If no user in request, deny access
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: No user role found');
    }

    // Check if user's role meets the requirement using hierarchy
    const hasAccess = this.checkRoleAccess(user.role, requiredRoles);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied: ${user.role} role is not authorized to access this resource`,
      );
    }

    return true;
  }

  /**
   * Check if user's role has access based on role hierarchy
   * A user can access endpoints that require their role or any role below them in hierarchy
   */
  private checkRoleAccess(userRole: Role, requiredRoles: Role[]): boolean {
    const userRoleLevel = this.roleHierarchy[userRole];

    // Check if user's role level is >= any of the required role levels
    return requiredRoles.some((requiredRole) => {
      const requiredRoleLevel = this.roleHierarchy[requiredRole];
      return userRoleLevel >= requiredRoleLevel;
    });
  }
}
