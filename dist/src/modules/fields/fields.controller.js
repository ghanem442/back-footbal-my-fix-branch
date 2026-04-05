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
exports.FieldsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const fields_service_1 = require("./fields.service");
const create_field_dto_1 = require("./dto/create-field.dto");
const update_field_dto_1 = require("./dto/update-field.dto");
const query_fields_dto_1 = require("./dto/query-fields.dto");
const search_fields_dto_1 = require("./dto/search-fields.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const client_1 = require("@prisma/client");
const i18n_service_1 = require("../i18n/i18n.service");
const file_validation_pipe_1 = require("../../common/pipes/file-validation.pipe");
let FieldsController = class FieldsController {
    constructor(fieldsService, i18n) {
        this.fieldsService = fieldsService;
        this.i18n = i18n;
    }
    async createField(userId, createFieldDto) {
        const field = await this.fieldsService.createField(userId, createFieldDto);
        const message = await this.i18n.getBilingualMessage('field.created');
        return {
            success: true,
            data: field,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async getFields(queryDto, userId) {
        const filterByOwner = queryDto.myFields === true && userId;
        const result = await this.fieldsService.findAll(queryDto, filterByOwner ? userId : undefined);
        const message = await this.i18n.getBilingualMessage('field.listRetrieved');
        return {
            success: true,
            data: result.data,
            meta: result.meta,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async searchFields(searchDto) {
        const result = await this.fieldsService.searchNearby(searchDto);
        const message = await this.i18n.getBilingualMessage('field.searchCompleted');
        return {
            success: true,
            data: result.data,
            count: result.count,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async getFieldById(id) {
        const field = await this.fieldsService.getFieldDetails(id);
        const message = await this.i18n.getBilingualMessage('field.retrieved');
        return {
            success: true,
            data: field,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async updateField(userId, fieldId, updateFieldDto) {
        const field = await this.fieldsService.updateField(fieldId, userId, updateFieldDto);
        const message = await this.i18n.getBilingualMessage('field.updated');
        return {
            success: true,
            data: field,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async deleteField(userId, fieldId) {
        await this.fieldsService.deleteField(fieldId, userId);
        const message = await this.i18n.getBilingualMessage('field.deleted');
        return {
            success: true,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async uploadImage(userId, fieldId, file) {
        if (!file) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.noFileProvided'));
        }
        const fieldImage = await this.fieldsService.uploadImage(fieldId, userId, file);
        const message = await this.i18n.getBilingualMessage('field.imageUploaded');
        return {
            success: true,
            data: fieldImage,
            message,
            timestamp: new Date().toISOString(),
        };
    }
    async deleteImage(userId, fieldId, imageId) {
        await this.fieldsService.deleteImage(fieldId, imageId, userId);
        const message = await this.i18n.getBilingualMessage('field.imageDeleted');
        return {
            success: true,
            message,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.FieldsController = FieldsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new field',
        description: 'Field owners can create a new football field with details including location, pricing, and description.',
    }),
    (0, swagger_1.ApiBody)({ type: create_field_dto_1.CreateFieldDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Field created successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'Champions Field',
                    description: 'Professional 5-a-side football field',
                    address: '123 Sports Street, Cairo',
                    latitude: 30.0444,
                    longitude: 31.2357,
                    basePrice: 200.00,
                    averageRating: 0,
                    totalReviews: 0,
                },
                message: {
                    en: 'Field created successfully',
                    ar: 'تم إنشاء الملعب بنجاح',
                },
                timestamp: '2024-01-15T10:30:00Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Authentication required',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Only field owners can create fields',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_field_dto_1.CreateFieldDto]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "createField", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all fields',
        description: 'Get paginated list of all fields. Field owners can use myFields=true to see only their own fields.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 }),
    (0, swagger_1.ApiQuery)({ name: 'myFields', required: false, type: Boolean, description: 'Filter to show only my fields (for field owners)', example: true }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_fields_dto_1.QueryFieldsDto, String]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "getFields", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('search'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Geographic field search',
        description: 'Search for football fields near a location using latitude, longitude, and radius. Public endpoint - no authentication required.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'latitude', type: Number, description: 'Latitude coordinate', example: 30.0444 }),
    (0, swagger_1.ApiQuery)({ name: 'longitude', type: Number, description: 'Longitude coordinate', example: 31.2357 }),
    (0, swagger_1.ApiQuery)({ name: 'radiusKm', type: Number, required: false, description: 'Search radius in kilometers (default: 10)', example: 5 }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', type: Number, required: false, description: 'Minimum price filter' }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', type: Number, required: false, description: 'Maximum price filter' }),
    (0, swagger_1.ApiQuery)({ name: 'minRating', type: Number, required: false, description: 'Minimum rating filter (1-5)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Fields found successfully',
        schema: {
            example: {
                success: true,
                data: [
                    {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        name: 'Champions Field',
                        address: '123 Sports Street, Cairo',
                        basePrice: 200.00,
                        averageRating: 4.5,
                        distanceKm: 2.3,
                        primaryImage: 'https://example.com/image.jpg',
                    },
                ],
                count: 1,
                message: {
                    en: 'Search completed successfully',
                    ar: 'تم البحث بنجاح',
                },
                timestamp: '2024-01-15T10:30:00Z',
            },
        },
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_fields_dto_1.SearchFieldsDto]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "searchFields", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "getFieldById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_field_dto_1.UpdateFieldDto]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "updateField", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "deleteField", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload field image',
        description: 'Upload an image for a field. Supports JPEG, PNG, and WebP formats. Maximum file size: 5MB. Field owners can only upload images to their own fields.',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Field ID' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (JPEG, PNG, or WebP, max 5MB)',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Image uploaded successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    url: 'https://example.com/uploads/field-image.jpg',
                    isPrimary: false,
                    order: 1,
                },
                message: {
                    en: 'Image uploaded successfully',
                    ar: 'تم رفع الصورة بنجاح',
                },
                timestamp: '2024-01-15T10:30:00Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid file format or size',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only upload images to own fields',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)(new file_validation_pipe_1.FileValidationPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Delete)(':id/images/:imageId'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('imageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FieldsController.prototype, "deleteImage", null);
exports.FieldsController = FieldsController = __decorate([
    (0, swagger_1.ApiTags)('Fields'),
    (0, common_1.Controller)('fields'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [fields_service_1.FieldsService,
        i18n_service_1.I18nService])
], FieldsController);
//# sourceMappingURL=fields.controller.js.map