import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';
import { SearchFieldsDto } from './dto/search-fields.dto';
import { I18nService } from '@modules/i18n/i18n.service';
export declare class FieldsController {
    private readonly fieldsService;
    private readonly i18n;
    constructor(fieldsService: FieldsService, i18n: I18nService);
    createField(userId: string, createFieldDto: CreateFieldDto): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deletedAt: Date | null;
            description: string | null;
            address: string;
            latitude: number | null;
            longitude: number | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    getFields(queryDto: QueryFieldsDto, userId?: string): Promise<{
        success: boolean;
        data: ({
            owner: {
                id: string;
                email: string;
                phoneNumber: string | null;
            };
            images: {
                id: string;
                createdAt: Date;
                url: string;
                order: number;
                isPrimary: boolean;
                fieldId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deletedAt: Date | null;
            description: string | null;
            address: string;
            latitude: number | null;
            longitude: number | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    searchFields(searchDto: SearchFieldsDto): Promise<{
        success: boolean;
        data: {
            distanceKm: number;
            owner?: {
                id: string;
                email: string;
                phoneNumber: string | null;
            } | undefined;
            images?: {
                id: string;
                createdAt: Date;
                url: string;
                order: number;
                isPrimary: boolean;
                fieldId: string;
            }[] | undefined;
            id?: string | undefined;
            createdAt?: Date | undefined;
            updatedAt?: Date | undefined;
            name?: string | undefined;
            deletedAt?: Date | null | undefined;
            description?: string | null | undefined;
            address?: string | undefined;
            latitude?: number | null | undefined;
            longitude?: number | null | undefined;
            basePrice?: import("@prisma/client/runtime/library").Decimal | null | undefined;
            commissionRate?: import("@prisma/client/runtime/library").Decimal | null | undefined;
            ownerId?: string | undefined;
            nameAr?: string | null | undefined;
            descriptionAr?: string | null | undefined;
            addressAr?: string | null | undefined;
            averageRating?: number | null | undefined;
            totalReviews?: number | undefined;
            status?: import(".prisma/client").$Enums.FieldStatus | undefined;
        }[];
        count: number;
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    getFieldById(id: string): Promise<{
        success: boolean;
        data: {
            owner: {
                id: string;
                email: string;
                phoneNumber: string | null;
            };
            images: {
                id: string;
                createdAt: Date;
                url: string;
                order: number;
                isPrimary: boolean;
                fieldId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deletedAt: Date | null;
            description: string | null;
            address: string;
            latitude: number | null;
            longitude: number | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    updateField(userId: string, fieldId: string, updateFieldDto: UpdateFieldDto): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            deletedAt: Date | null;
            description: string | null;
            address: string;
            latitude: number | null;
            longitude: number | null;
            basePrice: import("@prisma/client/runtime/library").Decimal | null;
            commissionRate: import("@prisma/client/runtime/library").Decimal | null;
            ownerId: string;
            nameAr: string | null;
            descriptionAr: string | null;
            addressAr: string | null;
            averageRating: number | null;
            totalReviews: number;
            status: import(".prisma/client").$Enums.FieldStatus;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    deleteField(userId: string, fieldId: string): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    uploadImage(userId: string, fieldId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            url: string;
            order: number;
            isPrimary: boolean;
            fieldId: string;
        };
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
    deleteImage(userId: string, fieldId: string, imageId: string): Promise<{
        success: boolean;
        message: {
            en: string;
            ar: string;
        };
        timestamp: string;
    }>;
}
