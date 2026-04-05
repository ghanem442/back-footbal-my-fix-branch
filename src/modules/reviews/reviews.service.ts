import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto, QueryReviewsDto } from './dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Create a new review for a completed booking
   */
  async create(userId: string, dto: CreateReviewDto) {
    // Validate booking exists and is COMPLETED
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        review: true,
        field: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        await this.i18n.translate('errors.BOOKING_NOT_FOUND', {
          lang: 'en',
        }),
      );
    }

    // Validate booking belongs to authenticated player
    if (booking.playerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('errors.FORBIDDEN', {
          lang: 'en',
        }),
      );
    }

    // Validate booking is COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        await this.i18n.translate('errors.BOOKING_NOT_COMPLETED', {
          lang: 'en',
        }),
      );
    }

    // Prevent duplicate reviews for same booking
    if (booking.review) {
      throw new ConflictException(
        await this.i18n.translate('errors.REVIEW_ALREADY_EXISTS', {
          lang: 'en',
        }),
      );
    }

    // Create review and update field average rating in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the review
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

      // Calculate new average rating for the field
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

      // Update field with new average rating and total reviews count
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

  /**
   * Get reviews with filtering and pagination
   */
  async findAll(query: QueryReviewsDto) {
    const { fieldId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
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

  /**
   * Get a single review by ID
   */
  async findOne(id: string) {
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
      throw new NotFoundException(
        await this.i18n.translate('errors.REVIEW_NOT_FOUND', {
          lang: 'en',
        }),
      );
    }

    return review;
  }

  /**
   * Update a review (player can only update their own reviews)
   */
  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.findOne(id);

    // Validate ownership
    if (review.playerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('errors.FORBIDDEN', {
          lang: 'en',
        }),
      );
    }

    // Update review and recalculate field average rating in a transaction
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

      // Recalculate average rating if rating was updated
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

  /**
   * Soft delete a review (player can delete own reviews, admin can delete any)
   */
  async remove(id: string, userId: string, isAdmin: boolean = false) {
    const review = await this.findOne(id);

    // Validate ownership (unless admin)
    if (!isAdmin && review.playerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('errors.FORBIDDEN', {
          lang: 'en',
        }),
      );
    }

    // Soft delete review and recalculate field average rating in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Recalculate average rating
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

  /**
   * Field owner reply to a review
   */
  async reply(id: string, userId: string, dto: ReplyReviewDto) {
    const review = await this.findOne(id);

    // Validate that the user is the field owner
    if (review.field.owner.id !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('errors.FORBIDDEN', {
          lang: 'en',
        }),
      );
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
}
