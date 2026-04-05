import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current authenticated user profile
   * GET /users/me
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile data.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'player@example.com',
          role: 'PLAYER',
          phoneNumber: '+201234567890',
          preferredLanguage: 'en',
          isVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    },
  })
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Update current user profile
   * PATCH /users/me
   */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update phone number or preferred language for the authenticated user.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Ahmed Mohamed' },
        phoneNumber: { type: 'string', example: '+201234567890' },
        preferredLanguage: { type: 'string', example: 'ar', enum: ['en', 'ar'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  async updateMe(
    @Request() req: any,
    @Body() body: { name?: string; phoneNumber?: string; preferredLanguage?: string },
  ) {
    const user = await this.usersService.updateProfile(req.user.userId, {
      name: body.name,
      phoneNumber: body.phoneNumber,
      preferredLanguage: body.preferredLanguage,
    });

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      message: {
        en: 'Profile updated successfully',
        ar: 'تم تحديث الملف الشخصي بنجاح',
      },
    };
  }
  /**
   * Change user role (Admin only)
   * Invalidates all existing tokens for the user
   * @param id - User ID
   * @param updateUserRoleDto - New role
   */
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change user role',
    description: 'Admin can change a user\'s role. All existing tokens for the user will be invalidated for security.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    schema: {
      example: {
        success: true,
        message: 'User role updated successfully. All user tokens have been invalidated.',
        data: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          oldRole: 'PLAYER',
          newRole: 'FIELD_OWNER',
          updatedAt: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user.userId;
    const adminEmail = req.user.email;

    this.logger.log(
      `Admin ${adminEmail} (${adminUserId}) is changing role for user ${id} to ${updateUserRoleDto.role}`,
    );

    const updatedUser = await this.usersService.changeUserRole(
      id,
      updateUserRoleDto.role,
      adminUserId,
    );

    this.logger.log(
      `Successfully changed role for user ${id} from ${updatedUser.oldRole} to ${updatedUser.newRole}`,
    );

    return {
      success: true,
      message: 'User role updated successfully. All user tokens have been invalidated.',
      data: {
        userId: updatedUser.user.id,
        email: updatedUser.user.email,
        oldRole: updatedUser.oldRole,
        newRole: updatedUser.user.role,
        updatedAt: updatedUser.user.updatedAt,
      },
    };
  }
}
