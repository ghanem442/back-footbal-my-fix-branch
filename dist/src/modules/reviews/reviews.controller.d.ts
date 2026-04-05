import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto, QueryReviewsDto } from './dto';
import { Role } from '@prisma/client';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(userId: string, createReviewDto: CreateReviewDto): Promise<{
        field: {
            id: string;
            name: string;
        };
        player: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fieldId: string;
        playerId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
        commentAr: string | null;
        reply: string | null;
        replyAr: string | null;
        ownerReply: string | null;
        repliedAt: Date | null;
    }>;
    findAll(query: QueryReviewsDto): Promise<{
        data: ({
            field: {
                id: string;
                name: string;
            };
            player: {
                id: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            fieldId: string;
            playerId: string;
            bookingId: string;
            rating: number;
            comment: string | null;
            commentAr: string | null;
            reply: string | null;
            replyAr: string | null;
            ownerReply: string | null;
            repliedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        field: {
            id: string;
            name: string;
            owner: {
                id: string;
                email: string;
            };
        };
        player: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fieldId: string;
        playerId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
        commentAr: string | null;
        reply: string | null;
        replyAr: string | null;
        ownerReply: string | null;
        repliedAt: Date | null;
    }>;
    update(id: string, userId: string, updateReviewDto: UpdateReviewDto): Promise<{
        field: {
            id: string;
            name: string;
        };
        player: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fieldId: string;
        playerId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
        commentAr: string | null;
        reply: string | null;
        replyAr: string | null;
        ownerReply: string | null;
        repliedAt: Date | null;
    }>;
    remove(id: string, userId: string, userRole: Role): Promise<{
        message: string;
    }>;
    reply(id: string, userId: string, replyReviewDto: ReplyReviewDto): Promise<{
        field: {
            id: string;
            name: string;
        };
        player: {
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fieldId: string;
        playerId: string;
        bookingId: string;
        rating: number;
        comment: string | null;
        commentAr: string | null;
        reply: string | null;
        replyAr: string | null;
        ownerReply: string | null;
        repliedAt: Date | null;
    }>;
}
