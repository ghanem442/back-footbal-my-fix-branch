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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const i18n_service_1 = require("../i18n/i18n.service");
let NotificationsController = class NotificationsController {
    constructor(notificationsService, i18n) {
        this.notificationsService = notificationsService;
        this.i18n = i18n;
    }
    async registerDevice(userId, dto) {
        await this.notificationsService.registerDevice(userId, dto.token, dto.deviceId);
        const message = await this.i18n.getBilingualMessage('notification.deviceRegistered');
        return {
            success: true,
            message,
        };
    }
    async unregisterDevice(dto) {
        await this.notificationsService.unregisterDevice(dto.token);
        const message = await this.i18n.getBilingualMessage('notification.deviceUnregistered');
        return {
            success: true,
            message,
        };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('register-device'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Register device for push notifications',
        description: 'Register a device FCM token to receive push notifications. Supports multiple devices per user.',
    }),
    (0, swagger_1.ApiBody)({ type: dto_1.RegisterDeviceDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Device registered successfully',
        schema: {
            example: {
                success: true,
                message: {
                    en: 'Device registered successfully',
                    ar: 'تم تسجيل الجهاز بنجاح',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Authentication required',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.RegisterDeviceDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Delete)('unregister-device'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UnregisterDeviceDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unregisterDevice", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        i18n_service_1.I18nService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map