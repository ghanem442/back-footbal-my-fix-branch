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
exports.TimeSlotsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const time_slots_service_1 = require("./time-slots.service");
const create_time_slot_dto_1 = require("./dto/create-time-slot.dto");
const update_time_slot_dto_1 = require("./dto/update-time-slot.dto");
const query_time_slots_dto_1 = require("./dto/query-time-slots.dto");
const bulk_create_time_slots_dto_1 = require("./dto/bulk-create-time-slots.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const i18n_service_1 = require("../i18n/i18n.service");
let TimeSlotsController = class TimeSlotsController {
    constructor(timeSlotsService, i18n) {
        this.timeSlotsService = timeSlotsService;
        this.i18n = i18n;
    }
    async createTimeSlot(userId, createTimeSlotDto) {
        const timeSlot = await this.timeSlotsService.createTimeSlot(userId, createTimeSlotDto);
        const message = await this.i18n.getBilingualMessage('timeSlot.created');
        return {
            success: true,
            data: timeSlot,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async bulkCreateTimeSlots(userId, bulkCreateDto) {
        const result = await this.timeSlotsService.bulkCreateTimeSlots(userId, bulkCreateDto);
        const message = await this.i18n.getBilingualMessage('timeSlot.bulkCreated');
        return {
            success: true,
            data: result,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async queryTimeSlots(queryDto) {
        const result = await this.timeSlotsService.queryTimeSlots(queryDto);
        const message = await this.i18n.getBilingualMessage('timeSlot.listRetrieved');
        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async updateTimeSlot(userId, timeSlotId, updateTimeSlotDto) {
        const timeSlot = await this.timeSlotsService.updateTimeSlot(timeSlotId, userId, updateTimeSlotDto);
        const message = await this.i18n.getBilingualMessage('timeSlot.updated');
        return {
            success: true,
            data: timeSlot,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async deleteTimeSlot(userId, timeSlotId) {
        await this.timeSlotsService.deleteTimeSlot(timeSlotId, userId);
        const message = await this.i18n.getBilingualMessage('timeSlot.deleted');
        return {
            success: true,
            message,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.TimeSlotsController = TimeSlotsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_time_slot_dto_1.CreateTimeSlotDto]),
    __metadata("design:returntype", Promise)
], TimeSlotsController.prototype, "createTimeSlot", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Bulk create time slots',
        description: 'Field owners can create multiple time slots at once for recurring schedules. Validates no overlapping slots exist.',
    }),
    (0, swagger_1.ApiBody)({ type: bulk_create_time_slots_dto_1.BulkCreateTimeSlotsDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Time slots created successfully',
        schema: {
            example: {
                success: true,
                data: {
                    created: 10,
                    timeSlots: [],
                },
                message: {
                    en: 'Time slots created successfully',
                    ar: 'تم إنشاء الفترات الزمنية بنجاح',
                },
                timestamp: '2024-01-15T10:30:00Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid time range or overlapping slots',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only create slots for own fields',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, bulk_create_time_slots_dto_1.BulkCreateTimeSlotsDto]),
    __metadata("design:returntype", Promise)
], TimeSlotsController.prototype, "bulkCreateTimeSlots", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_time_slots_dto_1.QueryTimeSlotsDto]),
    __metadata("design:returntype", Promise)
], TimeSlotsController.prototype, "queryTimeSlots", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_time_slot_dto_1.UpdateTimeSlotDto]),
    __metadata("design:returntype", Promise)
], TimeSlotsController.prototype, "updateTimeSlot", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TimeSlotsController.prototype, "deleteTimeSlot", null);
exports.TimeSlotsController = TimeSlotsController = __decorate([
    (0, swagger_1.ApiTags)('Time Slots'),
    (0, common_1.Controller)('time-slots'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [time_slots_service_1.TimeSlotsService,
        i18n_service_1.I18nService])
], TimeSlotsController);
//# sourceMappingURL=time-slots.controller.js.map