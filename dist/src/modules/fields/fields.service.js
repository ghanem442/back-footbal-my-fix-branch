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
exports.FieldsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const i18n_service_1 = require("../i18n/i18n.service");
const storage_service_1 = require("../storage/storage.service");
const client_1 = require("@prisma/client");
const file_validation_util_1 = require("../../common/utils/file-validation.util");
let FieldsService = class FieldsService {
    constructor(prisma, i18n, storageService) {
        this.prisma = prisma;
        this.i18n = i18n;
        this.storageService = storageService;
    }
    async createField(ownerId, createFieldDto) {
        this.validateCoordinates(createFieldDto.latitude, createFieldDto.longitude);
        const pointWKT = `POINT(${createFieldDto.longitude} ${createFieldDto.latitude})`;
        try {
            const field = await this.prisma.$executeRawUnsafe(`
        INSERT INTO "Field" (
          id, "ownerId", name, description, address, 
          location, latitude, longitude, "basePrice", "commissionRate",
          "averageRating", "totalReviews", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          ST_GeogFromText($5), $6, $7, $8, $9,
          0, 0, NOW(), NOW()
        )
        RETURNING *
        `, ownerId, createFieldDto.name, createFieldDto.description, createFieldDto.address, pointWKT, createFieldDto.latitude, createFieldDto.longitude, createFieldDto.basePrice ?? null, createFieldDto.commissionRate ?? null);
            const createdField = await this.prisma.field.findFirst({
                where: {
                    ownerId,
                    name: createFieldDto.name,
                    latitude: createFieldDto.latitude,
                    longitude: createFieldDto.longitude,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            if (!createdField) {
                throw new common_1.BadRequestException(await this.i18n.translate('field.created'));
            }
            return createdField;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(await this.i18n.translate('field.invalidCoordinates'));
        }
    }
    validateCoordinates(latitude, longitude) {
        if (latitude < -90 || latitude > 90) {
            throw new common_1.BadRequestException('Latitude must be between -90 and 90');
        }
        if (longitude < -180 || longitude > 180) {
            throw new common_1.BadRequestException('Longitude must be between -180 and 180');
        }
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new common_1.BadRequestException('Invalid coordinate values');
        }
    }
    async findById(id) {
        return this.prisma.field.findUnique({
            where: { id, deletedAt: null },
        });
    }
    async getFieldDetails(id) {
        const field = await this.prisma.field.findUnique({
            where: { id, deletedAt: null },
            include: {
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
            },
        });
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        return field;
    }
    async findAll(queryDto, ownerId) {
        const { page = 1, limit = 10 } = queryDto;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (ownerId) {
            where.ownerId = ownerId;
        }
        const total = await this.prisma.field.count({ where });
        const fields = await this.prisma.field.findMany({
            where,
            include: {
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                    take: 1,
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });
        return {
            data: fields,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async searchNearby(searchDto) {
        const { latitude, longitude, radiusKm = 10, minPrice, maxPrice, minRating, } = searchDto;
        this.validateCoordinates(latitude, longitude);
        const radiusMeters = radiusKm * 1000;
        const conditions = [
            'f."deletedAt" IS NULL',
            `ST_DWithin(f.location, ST_MakePoint($1, $2)::geography, $3)`,
        ];
        const params = [longitude, latitude, radiusMeters];
        let paramIndex = 4;
        if (minRating !== undefined) {
            conditions.push(`f."averageRating" >= $${paramIndex}`);
            params.push(minRating);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        const fieldsWithDistance = await this.prisma.$queryRawUnsafe(`
      SELECT 
        f.id, f."ownerId", f.name, f.description, f.address,
        f.latitude, f.longitude, f."commissionRate",
        f."averageRating", f."totalReviews", f."createdAt", f."updatedAt", f."deletedAt",
        ST_Distance(f.location, ST_MakePoint($1, $2)::geography) / 1000 AS distance
      FROM "Field" f
      WHERE ${whereClause}
      ORDER BY distance ASC
      `, ...params);
        const fieldIds = fieldsWithDistance.map((f) => f.id);
        if (fieldIds.length === 0) {
            return {
                data: [],
                count: 0,
            };
        }
        const fieldsWithRelations = await this.prisma.field.findMany({
            where: {
                id: { in: fieldIds },
            },
            include: {
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                    take: 1,
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
            },
        });
        const fieldsMap = new Map(fieldsWithRelations.map((field) => [field.id, field]));
        const results = fieldsWithDistance.map((fieldWithDistance) => {
            const fieldWithRelations = fieldsMap.get(fieldWithDistance.id);
            return {
                ...fieldWithRelations,
                distanceKm: Number(fieldWithDistance.distance.toFixed(2)),
            };
        });
        return {
            data: results,
            count: results.length,
        };
    }
    async isFieldOwner(fieldId, userId) {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId, deletedAt: null },
            select: { ownerId: true },
        });
        return field?.ownerId === userId;
    }
    async updateField(fieldId, ownerId, updateFieldDto) {
        const field = await this.findById(fieldId);
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== ownerId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        if (updateFieldDto.latitude !== undefined || updateFieldDto.longitude !== undefined) {
            const latitude = updateFieldDto.latitude ?? field.latitude;
            const longitude = updateFieldDto.longitude ?? field.longitude;
            if (latitude !== null && longitude !== null) {
                this.validateCoordinates(latitude, longitude);
            }
        }
        if (updateFieldDto.latitude !== undefined || updateFieldDto.longitude !== undefined) {
            const latitude = updateFieldDto.latitude ?? field.latitude;
            const longitude = updateFieldDto.longitude ?? field.longitude;
            const pointWKT = `POINT(${longitude} ${latitude})`;
            try {
                await this.prisma.$executeRawUnsafe(`
          UPDATE "Field"
          SET 
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            address = COALESCE($4, address),
            location = ST_GeogFromText($5),
            latitude = $6,
            longitude = $7,
            "commissionRate" = COALESCE($8, "commissionRate"),
            "updatedAt" = NOW()
          WHERE id = $1
          `, fieldId, updateFieldDto.name ?? null, updateFieldDto.description ?? null, updateFieldDto.address ?? null, pointWKT, latitude, longitude, updateFieldDto.commissionRate ?? null);
            }
            catch (error) {
                throw new common_1.BadRequestException(await this.i18n.translate('field.updateFailed'));
            }
        }
        else {
            const updateData = {};
            if (updateFieldDto.name !== undefined)
                updateData.name = updateFieldDto.name;
            if (updateFieldDto.description !== undefined)
                updateData.description = updateFieldDto.description;
            if (updateFieldDto.address !== undefined)
                updateData.address = updateFieldDto.address;
            if (updateFieldDto.commissionRate !== undefined)
                updateData.commissionRate = updateFieldDto.commissionRate;
            await this.prisma.field.update({
                where: { id: fieldId },
                data: updateData,
            });
        }
        const updatedField = await this.findById(fieldId);
        if (!updatedField) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        return updatedField;
    }
    async deleteField(fieldId, ownerId) {
        const field = await this.findById(fieldId);
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== ownerId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        await this.prisma.$transaction(async (tx) => {
            const futureBookings = await tx.booking.findMany({
                where: {
                    fieldId,
                    status: {
                        in: [client_1.BookingStatus.PENDING_PAYMENT, client_1.BookingStatus.CONFIRMED],
                    },
                    scheduledDate: {
                        gte: new Date(),
                    },
                },
                include: {
                    timeSlot: true,
                },
            });
            for (const booking of futureBookings) {
                if (booking.timeSlot) {
                    await tx.timeSlot.update({
                        where: { id: booking.timeSlot.id },
                        data: { status: 'AVAILABLE' },
                    });
                }
                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: client_1.BookingStatus.CANCELLED,
                        cancelledAt: new Date(),
                        cancelledBy: ownerId,
                        refundAmount: booking.depositAmount,
                    },
                });
                await tx.bookingStatusHistory.create({
                    data: {
                        bookingId: booking.id,
                        fromStatus: booking.status,
                        toStatus: client_1.BookingStatus.CANCELLED,
                        reason: 'Field deleted by owner - full refund issued',
                    },
                });
                const playerWallet = await tx.wallet.findUnique({
                    where: { userId: booking.playerId },
                });
                if (playerWallet) {
                    const refundAmount = Number(booking.depositAmount);
                    const balanceBefore = playerWallet.balance;
                    const balanceAfter = new client_1.Prisma.Decimal(balanceBefore.toString())
                        .plus(refundAmount)
                        .toDecimalPlaces(2);
                    await tx.wallet.update({
                        where: { id: playerWallet.id },
                        data: { balance: balanceAfter },
                    });
                    await tx.walletTransaction.create({
                        data: {
                            walletId: playerWallet.id,
                            type: client_1.WalletTransactionType.REFUND,
                            amount: new client_1.Prisma.Decimal(refundAmount),
                            balanceBefore,
                            balanceAfter,
                            reference: booking.id,
                            description: `Full refund for booking ${booking.id} - field deleted`,
                        },
                    });
                }
                const netAmount = Number(booking.depositAmount) - Number(booking.commissionAmount);
                if (netAmount > 0) {
                    const fieldOwnerWallet = await tx.wallet.findUnique({
                        where: { userId: ownerId },
                    });
                    if (fieldOwnerWallet) {
                        const ownerBalanceBefore = fieldOwnerWallet.balance;
                        const ownerBalanceAfter = new client_1.Prisma.Decimal(ownerBalanceBefore.toString())
                            .minus(netAmount)
                            .toDecimalPlaces(2);
                        if (ownerBalanceAfter.lessThan(0)) {
                            throw new common_1.BadRequestException(`Cannot delete field: Insufficient wallet balance to reverse booking ${booking.id}. Field owner needs ${netAmount} but has ${ownerBalanceBefore}`);
                        }
                        await tx.wallet.update({
                            where: { id: fieldOwnerWallet.id },
                            data: { balance: ownerBalanceAfter },
                        });
                        await tx.walletTransaction.create({
                            data: {
                                walletId: fieldOwnerWallet.id,
                                type: client_1.WalletTransactionType.DEBIT,
                                amount: new client_1.Prisma.Decimal(netAmount),
                                balanceBefore: ownerBalanceBefore,
                                balanceAfter: ownerBalanceAfter,
                                reference: booking.id,
                                description: `Reversal for booking ${booking.id} - field deleted`,
                            },
                        });
                    }
                }
            }
            await tx.field.update({
                where: { id: fieldId },
                data: { deletedAt: new Date() },
            });
        });
    }
    async uploadImage(fieldId, userId, file) {
        const field = await this.findById(fieldId);
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        const currentImageCount = await this.prisma.fieldImage.count({
            where: { fieldId },
        });
        if (currentImageCount >= file_validation_util_1.FILE_VALIDATION_CONSTANTS.MAX_IMAGES_PER_FIELD) {
            throw new common_1.BadRequestException(await this.i18n.translate('field.maxImagesReached'));
        }
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
        const filename = `field-${fieldId}-${timestamp}-${randomString}.${extension}`;
        const imageUrl = await this.storageService.upload(file.buffer, filename, file.mimetype);
        const isPrimary = currentImageCount === 0;
        const fieldImage = await this.prisma.fieldImage.create({
            data: {
                fieldId,
                url: imageUrl,
                isPrimary,
                order: currentImageCount,
            },
        });
        return fieldImage;
    }
    async deleteImage(fieldId, imageId, userId) {
        const field = await this.findById(fieldId);
        if (!field) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.notFound'));
        }
        if (field.ownerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('field.notOwner'));
        }
        const image = await this.prisma.fieldImage.findUnique({
            where: { id: imageId },
        });
        if (!image || image.fieldId !== fieldId) {
            throw new common_1.NotFoundException(await this.i18n.translate('field.imageNotFound'));
        }
        try {
            await this.storageService.delete(image.url);
        }
        catch (error) {
            console.error('Failed to delete image from storage:', error);
        }
        await this.prisma.fieldImage.delete({
            where: { id: imageId },
        });
        if (image.isPrimary) {
            const nextImage = await this.prisma.fieldImage.findFirst({
                where: { fieldId },
                orderBy: { order: 'asc' },
            });
            if (nextImage) {
                await this.prisma.fieldImage.update({
                    where: { id: nextImage.id },
                    data: { isPrimary: true },
                });
            }
        }
    }
};
exports.FieldsService = FieldsService;
exports.FieldsService = FieldsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        i18n_service_1.I18nService,
        storage_service_1.StorageService])
], FieldsService);
//# sourceMappingURL=fields.service.js.map