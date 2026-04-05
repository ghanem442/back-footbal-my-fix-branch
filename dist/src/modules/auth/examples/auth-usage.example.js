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
exports.FieldsExampleController = exports.AdminExampleController = exports.ProfileExampleController = exports.AuthExampleController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth.service");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const public_decorator_1 = require("../decorators/public.decorator");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
let AuthExampleController = class AuthExampleController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.authService.generateTokenPair(user.id, user.email, user.role);
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
    async refresh(refreshDto) {
        try {
            const payload = await this.authService.verifyRefreshToken(refreshDto.refreshToken);
            const user = await this.getUserById(payload.userId);
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const tokens = await this.authService.generateTokenPair(user.id, user.email, user.role);
            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async validateUser(email, password) {
        return null;
    }
    async getUserById(userId) {
        return null;
    }
};
exports.AuthExampleController = AuthExampleController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthExampleController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthExampleController.prototype, "refresh", null);
exports.AuthExampleController = AuthExampleController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthExampleController);
let ProfileExampleController = class ProfileExampleController {
    getProfile(user) {
        return {
            userId: user.userId,
            email: user.email,
            role: user.role,
        };
    }
    getDetailedProfile(user) {
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
};
exports.ProfileExampleController = ProfileExampleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileExampleController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('details'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileExampleController.prototype, "getDetailedProfile", null);
exports.ProfileExampleController = ProfileExampleController = __decorate([
    (0, common_1.Controller)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)
], ProfileExampleController);
let AdminExampleController = class AdminExampleController {
    getDashboard(user) {
        if (user.role !== 'ADMIN') {
            throw new common_1.UnauthorizedException('Admin access required');
        }
        return {
            message: 'Admin dashboard data',
        };
    }
};
exports.AdminExampleController = AdminExampleController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminExampleController.prototype, "getDashboard", null);
exports.AdminExampleController = AdminExampleController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)
], AdminExampleController);
let FieldsExampleController = class FieldsExampleController {
    listFields() {
        return {
            message: 'Public list of fields',
        };
    }
    createField(user, fieldDto) {
        return {
            message: 'Field created',
            ownerId: user.userId,
        };
    }
};
exports.FieldsExampleController = FieldsExampleController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FieldsExampleController.prototype, "listFields", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FieldsExampleController.prototype, "createField", null);
exports.FieldsExampleController = FieldsExampleController = __decorate([
    (0, common_1.Controller)('fields')
], FieldsExampleController);
//# sourceMappingURL=auth-usage.example.js.map