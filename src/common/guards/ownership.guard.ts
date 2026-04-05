import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '@modules/prisma/prisma.service';
import {
  OWNERSHIP_KEY,
  OwnershipConfig,
  ResourceType,
} from '../decorators/ownership.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

/**
 * Guard that validates resource ownership for protected routes
 * - Checks if the user owns the resource they're trying to access
 * - Admin role bypasses all ownership checks
 * - Works alongside RolesGuard for complete authorization
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get ownership configuration from decorator metadata
    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipConfig>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no ownership configuration, allow access
    if (!ownershipConfig) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // If no user in request, deny access
    if (!user) {
      throw new ForbiddenException('Access denied: No user found');
    }

    // Admin can bypass all ownership checks
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Extract resource ID from route parameters
    const resourceId = request.params[ownershipConfig.paramName];
    if (!resourceId) {
      throw new ForbiddenException(
        `Access denied: Resource ID parameter '${ownershipConfig.paramName}' not found`,
      );
    }

    // Validate ownership based on resource type
    const hasOwnership = await this.validateOwnership(
      ownershipConfig.resourceType,
      resourceId,
      user.userId,
      user.role,
    );

    if (!hasOwnership) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to access this resource',
      );
    }

    return true;
  }

  /**
   * Validate ownership based on resource type
   */
  private async validateOwnership(
    resourceType: ResourceType,
    resourceId: string,
    userId: string,
    userRole: Role,
  ): Promise<boolean> {
    switch (resourceType) {
      case ResourceType.FIELD:
        return this.validateFieldOwnership(resourceId, userId, userRole);
      case ResourceType.BOOKING:
        return this.validateBookingOwnership(resourceId, userId, userRole);
      default:
        throw new ForbiddenException(
          `Access denied: Unknown resource type '${resourceType}'`,
        );
    }
  }

  /**
   * Validate field ownership
   * - Field_Owner can access only fields they own
   */
  private async validateFieldOwnership(
    fieldId: string,
    userId: string,
    userRole: Role,
  ): Promise<boolean> {
    // Only Field_Owner role should be checking field ownership
    // (Admin already bypassed earlier)
    if (userRole !== Role.FIELD_OWNER) {
      return false;
    }

    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true, ownerId: true, deletedAt: true },
    });

    if (!field) {
      throw new NotFoundException(`Field with ID '${fieldId}' not found`);
    }

    // Check if field is soft-deleted
    if (field.deletedAt) {
      throw new NotFoundException(`Field with ID '${fieldId}' not found`);
    }

    // Validate ownership
    return field.ownerId === userId;
  }

  /**
   * Validate booking ownership
   * - Player can access only bookings they created
   */
  private async validateBookingOwnership(
    bookingId: string,
    userId: string,
    userRole: Role,
  ): Promise<boolean> {
    // Only Player role should be checking booking ownership
    // (Admin already bypassed earlier)
    if (userRole !== Role.PLAYER) {
      return false;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, playerId: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID '${bookingId}' not found`);
    }

    // Validate ownership
    return booking.playerId === userId;
  }
}
