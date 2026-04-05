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
exports.TimeSlotsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const i18n_service_1 = require("../i18n/i18n.service");
const client_1 = require("@prisma/client");
let TimeSlotsService = class TimeSlotsService {
    constructor(prisma, i18n) {
        this.prisma = prisma;
        this.i18n = i18n;
    }
    async createTimeSlot(userId, dto) {
        const field = await this.prisma.field.findUnique({
            where: { id: dto.fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.notFound'));
        }
        const slotDate = new Date(dto.date + 'T00:00:00.000Z');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        slotDate.setHours(0, 0, 0, 0);
        if (slotDate < today) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.pastDate'));
        }
        const startTime = this.parseTime(dto.startTime);
        const endTime = this.parseTime(dto.endTime);
        if (startTime >= endTime) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.startTimeBeforeEndTime'));
        }
        if (dto.price <= 0) {
            throw new common_1.BadRequestException('Price must be greater than zero');
        }
        const overlappingSlots = await this.prisma.timeSlot.findMany({
            where: {
                fieldId: dto.fieldId,
                date: new Date(dto.date + 'T00:00:00.000Z'),
                OR: [
                    {
                        AND: [
                            { startTime: { lte: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
                            { endTime: { gt: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
                            { endTime: { gte: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: new Date(`1970-01-01T${dto.startTime}:00.000Z`) } },
                            { endTime: { lte: new Date(`1970-01-01T${dto.endTime}:00.000Z`) } },
                        ],
                    },
                ],
            },
        });
        if (overlappingSlots.length > 0) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.overlappingSlot'));
        }
        const timeSlot = await this.prisma.timeSlot.create({
            data: {
                fieldId: dto.fieldId,
                date: new Date(dto.date + 'T00:00:00.000Z'),
                startTime: new Date(`1970-01-01T${dto.startTime}:00.000Z`),
                endTime: new Date(`1970-01-01T${dto.endTime}:00.000Z`),
                price: dto.price,
                status: client_1.SlotStatus.AVAILABLE,
            },
            include: {
                field: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
        return timeSlot;
    }
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    async queryTimeSlots(dto) {
        const { fieldId, startDate, endDate, page = 1, limit = 10 } = dto;
        const where = {
            status: client_1.SlotStatus.AVAILABLE,
        };
        if (fieldId) {
            where.fieldId = fieldId;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate + 'T00:00:00.000Z');
            }
            if (endDate) {
                where.date.lte = new Date(endDate + 'T00:00:00.000Z');
            }
        }
        const now = new Date();
        const currentDate = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
        const hours = now.getUTCHours().toString().padStart(2, '0');
        const minutes = now.getUTCMinutes().toString().padStart(2, '0');
        const currentTime = new Date(`1970-01-01T${hours}:${minutes}:00.000Z`);
        where.AND = [
            {
                OR: [
                    { date: { gt: currentDate } },
                    {
                        AND: [
                            { date: currentDate },
                            { startTime: { gt: currentTime } },
                        ],
                    },
                ],
            },
        ];
        const skip = (page - 1) * limit;
        const [timeSlots, total] = await Promise.all([
            this.prisma.timeSlot.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { date: 'asc' },
                    { startTime: 'asc' },
                ],
                include: {
                    field: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            latitude: true,
                            longitude: true,
                            averageRating: true,
                        },
                    },
                },
            }),
            this.prisma.timeSlot.count({ where }),
        ]);
        return {
            data: timeSlots,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async updateTimeSlot(timeSlotId, userId, dto) {
        const timeSlot = await this.prisma.timeSlot.findUnique({
            where: { id: timeSlotId },
            include: {
                field: true,
                bookings: true,
            },
        });
        if (!timeSlot) {
            throw new common_1.NotFoundException(await this.i18n.translate('timeSlot.notFound'));
        }
        if (timeSlot.field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        if (timeSlot.field.deletedAt) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.notFound'));
        }
        if (timeSlot.status === client_1.SlotStatus.BOOKED) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.cannotModifyBooked'));
        }
        const newStartTime = dto.startTime || this.formatTime(timeSlot.startTime);
        const newEndTime = dto.endTime || this.formatTime(timeSlot.endTime);
        if (this.parseTime(newStartTime) >= this.parseTime(newEndTime)) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.startTimeBeforeEndTime'));
        }
        if (dto.date || dto.startTime || dto.endTime) {
            const newDate = dto.date
                ? new Date(dto.date + 'T00:00:00.000Z')
                : timeSlot.date;
            if (dto.date) {
                const slotDate = new Date(dto.date + 'T00:00:00.000Z');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                slotDate.setHours(0, 0, 0, 0);
                if (slotDate < today) {
                    throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.pastDate'));
                }
            }
            const overlappingSlots = await this.prisma.timeSlot.findMany({
                where: {
                    id: { not: timeSlotId },
                    fieldId: timeSlot.fieldId,
                    date: newDate,
                    OR: [
                        {
                            AND: [
                                { startTime: { lte: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
                                { endTime: { gt: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
                            ],
                        },
                        {
                            AND: [
                                { startTime: { lt: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
                                { endTime: { gte: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
                            ],
                        },
                        {
                            AND: [
                                { startTime: { gte: new Date(`1970-01-01T${newStartTime}:00.000Z`) } },
                                { endTime: { lte: new Date(`1970-01-01T${newEndTime}:00.000Z`) } },
                            ],
                        },
                    ],
                },
            });
            if (overlappingSlots.length > 0) {
                throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.overlappingSlot'));
            }
        }
        const updateData = {};
        if (dto.date) {
            updateData.date = new Date(dto.date + 'T00:00:00.000Z');
        }
        if (dto.startTime) {
            updateData.startTime = new Date(`1970-01-01T${dto.startTime}:00.000Z`);
        }
        if (dto.endTime) {
            updateData.endTime = new Date(`1970-01-01T${dto.endTime}:00.000Z`);
        }
        if (dto.price !== undefined) {
            if (dto.price <= 0) {
                throw new common_1.BadRequestException('Price must be greater than zero');
            }
            updateData.price = dto.price;
        }
        const updatedTimeSlot = await this.prisma.timeSlot.update({
            where: { id: timeSlotId },
            data: updateData,
            include: {
                field: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
        return updatedTimeSlot;
    }
    async deleteTimeSlot(timeSlotId, userId) {
        const timeSlot = await this.prisma.timeSlot.findUnique({
            where: { id: timeSlotId },
            include: {
                field: true,
                bookings: true,
            },
        });
        if (!timeSlot) {
            throw new common_1.NotFoundException(await this.i18n.translate('timeSlot.notFound'));
        }
        if (timeSlot.field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        if (timeSlot.field.deletedAt) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.notFound'));
        }
        if (timeSlot.status === client_1.SlotStatus.BOOKED) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.cannotModifyBooked'));
        }
        const slotDate = new Date(timeSlot.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        slotDate.setHours(0, 0, 0, 0);
        if (slotDate < today) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.cannotDeletePastSlot'));
        }
        await this.prisma.timeSlot.delete({
            where: { id: timeSlotId },
        });
    }
    formatTime(date) {
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    async bulkCreateTimeSlots(userId, dto) {
        const field = await this.prisma.field.findUnique({
            where: { id: dto.fieldId },
        });
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        if (field.deletedAt) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.notFound'));
        }
        const startDate = new Date(dto.startDate + 'T00:00:00.000Z');
        const endDate = new Date(dto.endDate + 'T00:00:00.000Z');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        if (startDate < today) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.pastDate'));
        }
        if (startDate > endDate) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.invalidDateRange'));
        }
        const invalidDays = dto.daysOfWeek.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.invalidDaysOfWeek'));
        }
        for (const timeRange of dto.timeRanges) {
            const startTime = this.parseTime(timeRange.startTime);
            const endTime = this.parseTime(timeRange.endTime);
            if (startTime >= endTime) {
                throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.startTimeBeforeEndTime'));
            }
            if (timeRange.price <= 0) {
                throw new common_1.BadRequestException('Price must be greater than zero');
            }
        }
        const datesToGenerate = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (dto.daysOfWeek.includes(dayOfWeek)) {
                datesToGenerate.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (datesToGenerate.length === 0) {
            throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.noDatesGenerated'));
        }
        const slotsToCreate = [];
        for (const date of datesToGenerate) {
            for (const timeRange of dto.timeRanges) {
                slotsToCreate.push({
                    fieldId: dto.fieldId,
                    date: date,
                    startTime: new Date(`1970-01-01T${timeRange.startTime}:00.000Z`),
                    endTime: new Date(`1970-01-01T${timeRange.endTime}:00.000Z`),
                    price: timeRange.price,
                    status: client_1.SlotStatus.AVAILABLE,
                });
            }
        }
        const result = await this.prisma.$transaction(async (tx) => {
            for (const slot of slotsToCreate) {
                const overlappingSlots = await tx.timeSlot.findMany({
                    where: {
                        fieldId: slot.fieldId,
                        date: slot.date,
                        OR: [
                            {
                                AND: [
                                    { startTime: { lte: slot.startTime } },
                                    { endTime: { gt: slot.startTime } },
                                ],
                            },
                            {
                                AND: [
                                    { startTime: { lt: slot.endTime } },
                                    { endTime: { gte: slot.endTime } },
                                ],
                            },
                            {
                                AND: [
                                    { startTime: { gte: slot.startTime } },
                                    { endTime: { lte: slot.endTime } },
                                ],
                            },
                        ],
                    },
                });
                if (overlappingSlots.length > 0) {
                    const dateStr = slot.date.toISOString().split('T')[0];
                    const startTimeStr = this.formatTime(slot.startTime);
                    const endTimeStr = this.formatTime(slot.endTime);
                    throw new common_1.BadRequestException(await this.i18n.translate('timeSlot.overlappingSlotDetails', {
                        args: { date: dateStr, startTime: startTimeStr, endTime: endTimeStr },
                    }));
                }
            }
            const createdSlots = await tx.timeSlot.createMany({
                data: slotsToCreate,
            });
            return createdSlots;
        });
        return {
            count: result.count,
            dates: datesToGenerate.length,
            timeRanges: dto.timeRanges.length,
        };
    }
};
exports.TimeSlotsService = TimeSlotsService;
exports.TimeSlotsService = TimeSlotsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        i18n_service_1.I18nService])
], TimeSlotsService);
//# sourceMappingURL=time-slots.service.js.map