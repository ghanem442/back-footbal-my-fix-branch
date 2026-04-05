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
var UsersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const update_user_role_dto_1 = require("./dto/update-user-role.dto");
let UsersController = UsersController_1 = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(UsersController_1.name);
    }
    async getMe(req) {
        const user = await this.usersService.findById(req.user.userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
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
    async updateMe(req, body) {
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
    async updateUserRole(id, updateUserRoleDto, req) {
        const adminUserId = req.user.userId;
        const adminEmail = req.user.email;
        this.logger.log(`Admin ${adminEmail} (${adminUserId}) is changing role for user ${id} to ${updateUserRoleDto.role}`);
        const updatedUser = await this.usersService.changeUserRole(id, updateUserRoleDto.role, adminUserId);
        this.logger.log(`Successfully changed role for user ${id} from ${updatedUser.oldRole} to ${updatedUser.newRole}`);
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
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current user profile',
        description: 'Returns the authenticated user profile data.',
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Update current user profile',
        description: 'Update phone number or preferred language for the authenticated user.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Ahmed Mohamed' },
                phoneNumber: { type: 'string', example: '+201234567890' },
                preferredLanguage: { type: 'string', example: 'ar', enum: ['en', 'ar'] },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Profile updated successfully',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Patch)(':id/role'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Change user role',
        description: 'Admin can change a user\'s role. All existing tokens for the user will be invalidated for security.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiBody)({ type: update_user_role_dto_1.UpdateUserRoleDto }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Admin access required',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'User not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_role_dto_1.UpdateUserRoleDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUserRole", null);
exports.UsersController = UsersController = UsersController_1 = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map