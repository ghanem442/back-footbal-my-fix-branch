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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const nestjs_i18n_1 = require("nestjs-i18n");
const client_1 = require("@prisma/client");
let ReviewsService = class ReviewsService {
    constructor(prisma, i18n) {
        this.prisma = prisma;
        this.i18n = i18n;
    }
    async create(userId, dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: {
                review: true,
                field: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException(await this.i18n.translate('errors.BOOKING_NOT_FOUND', {
                lang: 'en',
            }));
        }
        if (booking.playerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('errors.FORBIDDEN', {
                lang: 'en',
            }));
        }
        if (booking.status !== client_1.BookingStatus.COMPLETED) {
            throw new common_1.BadRequestException(await this.i18n.translate('errors.BOOKING_NOT_COMPLETED', {
                lang: 'en',
            }));
        }
        if (booking.review) {
            throw new common_1.ConflictException(await this.i18n.translate('errors.REVIEW_ALREADY_EXISTS', {
                lang: 'en',
            }));
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    bookingId: dto.bookingId,
                    fieldId: booking.fieldId,
                    playerId: userId,
                    rating: dto.rating,
                    comment: dto.comment,
                },
                include: {
                    player: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    field: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            const reviews = await tx.review.findMany({
                where: {
                    fieldId: booking.fieldId,
                    deletedAt: null,
                },
                select: {
                    rating: true,
                },
            });
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = totalRating / reviews.length;
            await tx.field.update({
                where: { id: booking.fieldId },
                data: {
                    averageRating,
                    totalReviews: reviews.length,
                },
            });
            return review;
        });
        return result;
    }
    async findAll(query) {
        const { fieldId, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const where = {
            deletedAt: null,
        };
        if (fieldId) {
            where.fieldId = fieldId;
        }
        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    player: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    field: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.review.count({ where }),
        ]);
        return {
            data: reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const review = await this.prisma.review.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                player: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                field: {
                    select: {
                        id: true,
                        name: true,
                        owner: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        if (!review) {
            throw new common_1.NotFoundException(await this.i18n.translate('errors.REVIEW_NOT_FOUND', {
                lang: 'en',
            }));
        }
        return review;
    }
    async update(id, userId, dto) {
        const review = await this.findOne(id);
        if (review.playerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('errors.FORBIDDEN', {
                lang: 'en',
            }));
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.review.update({
                where: { id },
                data: {
                    rating: dto.rating,
                    comment: dto.comment,
                },
                include: {
                    player: {
                        select: {
                            id: true,
                            email: true,
                        },
                    },
                    field: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            if (dto.rating !== undefined) {
                const reviews = await tx.review.findMany({
                    where: {
                        fieldId: review.fieldId,
                        deletedAt: null,
                    },
                    select: {
                        rating: true,
                    },
                });
                const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / reviews.length;
                await tx.field.update({
                    where: { id: review.fieldId },
                    data: {
                        averageRating,
                    },
                });
            }
            return updated;
        });
        return result;
    }
    async remove(id, userId, isAdmin = false) {
        const review = await this.findOne(id);
        if (!isAdmin && review.playerId !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('errors.FORBIDDEN', {
                lang: 'en',
            }));
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.review.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                },
            });
            const reviews = await tx.review.findMany({
                where: {
                    fieldId: review.fieldId,
                    deletedAt: null,
                },
                select: {
                    rating: true,
                },
            });
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;
            await tx.field.update({
                where: { id: review.fieldId },
                data: {
                    averageRating,
                    totalReviews: reviews.length,
                },
            });
        });
        return { message: 'Review deleted successfully' };
    }
    async reply(id, userId, dto) {
        const review = await this.findOne(id);
        if (review.field.owner.id !== userId) {
            throw new common_1.ForbiddenException(await this.i18n.translate('errors.FORBIDDEN', {
                lang: 'en',
            }));
        }
        const updated = await this.prisma.review.update({
            where: { id },
            data: {
                ownerReply: dto.ownerReply,
            },
            include: {
                player: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
                field: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return updated;
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nestjs_i18n_1.I18nService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map