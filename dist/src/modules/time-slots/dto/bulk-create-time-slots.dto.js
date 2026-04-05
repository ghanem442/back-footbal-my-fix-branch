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
exports.BulkCreateTimeSlotsDto = exports.TimeRangeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class TimeRangeDto {
}
exports.TimeRangeDto = TimeRangeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Start time in HH:mm format',
        example: '14:00',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TimeRangeDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'End time in HH:mm format',
        example: '16:00',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TimeRangeDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Price for this time range',
        example: 150.00,
        minimum: 0,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0, { message: 'Price must be a positive number' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], TimeRangeDto.prototype, "price", void 0);
class BulkCreateTimeSlotsDto {
}
exports.BulkCreateTimeSlotsDto = BulkCreateTimeSlotsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Field ID to create time slots for',
        example: 'clh1234567890',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkCreateTimeSlotsDto.prototype, "fieldId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Start date for bulk creation (ISO 8601)',
        example: '2024-03-01',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkCreateTimeSlotsDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'End date for bulk creation (ISO 8601)',
        example: '2024-03-31',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BulkCreateTimeSlotsDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Days of week to create slots (0=Sunday, 1=Monday, ..., 6=Saturday)',
        example: [1, 2, 3, 4, 5],
        type: [Number],
        minItems: 1,
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one day must be specified' }),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    (0, class_validator_1.Min)(0, { each: true, message: 'Day must be between 0 (Sunday) and 6 (Saturday)' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Array)
], BulkCreateTimeSlotsDto.prototype, "daysOfWeek", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Time ranges with prices for each slot',
        type: [TimeRangeDto],
        minItems: 1,
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one time range must be specified' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TimeRangeDto),
    __metadata("design:type", Array)
], BulkCreateTimeSlotsDto.prototype, "timeRanges", void 0);
//# sourceMappingURL=bulk-create-time-slots.dto.js.map