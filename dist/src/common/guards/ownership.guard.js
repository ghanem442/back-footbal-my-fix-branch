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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnershipGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../modules/prisma/prisma.service");
const ownership_decorator_1 = require("../decorators/ownership.decorator");
let OwnershipGuard = class OwnershipGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const ownershipConfig = this.reflector.getAllAndOverride(ownership_decorator_1.OWNERSHIP_KEY, [context.getHandler(), context.getClass()]);
        if (!ownershipConfig) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Access denied: No user found');
        }
        if (user.role === client_1.Role.ADMIN) {
            return true;
        }
        const resourceId = request.params[ownershipConfig.paramName];
        if (!resourceId) {
            throw new common_1.ForbiddenException(`Access denied: Resource ID parameter '${ownershipConfig.paramName}' not found`);
        }
        const hasOwnership = await this.validateOwnership(ownershipConfig.resourceType, resourceId, user.userId, user.role);
        if (!hasOwnership) {
            throw new common_1.ForbiddenException('Access denied: You do not have permission to access this resource');
        }
        return true;
    }
    async validateOwnership(resourceType, resourceId, userId, userRole) {
        switch (resourceType) {
            case ownership_decorator_1.ResourceType.FIELD:
                return this.validateFieldOwnership(resourceId, userId, userRole);
            case ownership_decorator_1.ResourceType.BOOKING:
                return this.validateBookingOwnership(resourceId, userId, userRole);
            default:
                throw new common_1.ForbiddenException(`Access denied: Unknown resource type '${resourceType}'`);
        }
    }
    async validateFieldOwnership(fieldId, userId, userRole) {
        if (userRole !== client_1.Role.FIELD_OWNER) {
            return false;
        }
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
            select: { id: true, ownerId: true, deletedAt: true },
        });
        if (!field) {
            throw new common_1.NotFoundException(`Field with ID '${fieldId}' not found`);
        }
        if (field.deletedAt) {
            throw new common_1.NotFoundException(`Field with ID '${fieldId}' not found`);
        }
        return field.ownerId === userId;
    }
    async validateBookingOwnership(bookingId, userId, userRole) {
        if (userRole !== client_1.Role.PLAYER) {
            return false;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, playerId: true },
        });
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with ID '${bookingId}' not found`);
        }
        return booking.playerId === userId;
    }
};
exports.OwnershipGuard = OwnershipGuard;
exports.OwnershipGuard = OwnershipGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], OwnershipGuard);
//# sourceMappingURL=ownership.guard.js.map