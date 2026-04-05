import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from 'nestjs-i18n';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto, QueryReviewsDto } from './dto';
export declare class ReviewsService {
    private readonly prisma;
    private readonly i18n;
    constructor(prisma: PrismaService, i18n: I18nService);
    create(userId: string, dto: CreateReviewDto): Promise<{
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
    update(id: string, userId: string, dto: UpdateReviewDto): Promise<{
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
    remove(id: string, userId: string, isAdmin?: boolean): Promise<{
        message: string;
    }>;
    reply(id: string, userId: string, dto: ReplyReviewDto): Promise<{
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
