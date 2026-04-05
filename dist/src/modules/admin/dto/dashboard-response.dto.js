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
exports.DashboardMetricsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class DashboardMetricsDto {
}
exports.DashboardMetricsDto = DashboardMetricsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of active bookings',
        example: 45,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "activeBookings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of pending payments',
        example: 12,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "pendingPayments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of users',
        example: 1250,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "totalUsers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of fields',
        example: 78,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "totalFields", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of bookings',
        example: 3456,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "totalBookings", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Today\'s revenue',
        example: 5420.50,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "todayRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Today\'s commission earned',
        example: 1355.12,
    }),
    __metadata("design:type", Number)
], DashboardMetricsDto.prototype, "todayCommission", void 0);
//# sourceMappingURL=dashboard-response.dto.js.map