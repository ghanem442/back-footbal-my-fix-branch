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
exports.Example3Controller = exports.Example2Controller = exports.ExampleController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../../modules/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./roles.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
let ExampleController = class ExampleController {
    getPlayerData() {
        return { message: 'This is accessible by Player, Field_Owner, and Admin' };
    }
    createField() {
        return { message: 'This is accessible by Field_Owner and Admin only' };
    }
    getAdminData() {
        return { message: 'This is accessible by Admin only' };
    }
    getOwnerOrAdminData() {
        return { message: 'This is accessible by Field_Owner and Admin' };
    }
    getAuthenticatedData() {
        return { message: 'Any authenticated user can access this' };
    }
};
exports.ExampleController = ExampleController;
__decorate([
    (0, common_1.Get)('player-only'),
    (0, roles_decorator_1.Roles)(client_1.Role.PLAYER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExampleController.prototype, "getPlayerData", null);
__decorate([
    (0, common_1.Post)('field-owner-only'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExampleController.prototype, "createField", null);
__decorate([
    (0, common_1.Get)('admin-only'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExampleController.prototype, "getAdminData", null);
__decorate([
    (0, common_1.Get)('owner-or-admin'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER, client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExampleController.prototype, "getOwnerOrAdminData", null);
__decorate([
    (0, common_1.Get)('authenticated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExampleController.prototype, "getAuthenticatedData", null);
exports.ExampleController = ExampleController = __decorate([
    (0, common_1.Controller)('example'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], ExampleController);
let Example2Controller = class Example2Controller {
    adminOnlyEndpoint() {
        return { message: 'Admin only' };
    }
    publicEndpoint() {
        return { message: 'Public endpoint' };
    }
};
exports.Example2Controller = Example2Controller;
__decorate([
    (0, common_1.Get)('admin-endpoint'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Example2Controller.prototype, "adminOnlyEndpoint", null);
__decorate([
    (0, common_1.Get)('public'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Example2Controller.prototype, "publicEndpoint", null);
exports.Example2Controller = Example2Controller = __decorate([
    (0, common_1.Controller)('example2')
], Example2Controller);
let Example3Controller = class Example3Controller {
    getCurrentUser(user) {
        return {
            userId: user.userId,
            email: user.email,
            role: user.role,
        };
    }
};
exports.Example3Controller = Example3Controller;
__decorate([
    (0, common_1.Get)('current-user'),
    (0, roles_decorator_1.Roles)(client_1.Role.PLAYER),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], Example3Controller.prototype, "getCurrentUser", null);
exports.Example3Controller = Example3Controller = __decorate([
    (0, common_1.Controller)('example3'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], Example3Controller);
const current_user_decorator_1 = require("../../modules/auth/decorators/current-user.decorator");
//# sourceMappingURL=roles.guard.example.js.map