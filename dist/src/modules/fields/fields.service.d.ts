import { PrismaService } from '@modules/prisma/prisma.service';
import { I18nService } from '@modules/i18n/i18n.service';
import { StorageService } from '@modules/storage/storage.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';
import { SearchFieldsDto } from './dto/search-fields.dto';
import { Field, Prisma, FieldImage } from '@prisma/client';
export declare class FieldsService {
    private readonly prisma;
    private readonly i18n;
    private readonly storageService;
    constructor(prisma: PrismaService, i18n: I18nService, storageService: StorageService);
    createField(ownerId: string, createFieldDto: CreateFieldDto): Promise<Field>;
    private validateCoordinates;
    findById(id: string): Promise<Field | null>;
    getFieldDetails(id: string): Promise<{
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
        basePrice: Prisma.Decimal | null;
        commissionRate: Prisma.Decimal | null;
        ownerId: string;
        nameAr: string | null;
        descriptionAr: string | null;
        addressAr: string | null;
        averageRating: number | null;
        totalReviews: number;
        status: import(".prisma/client").$Enums.FieldStatus;
    }>;
    findAll(queryDto: QueryFieldsDto, ownerId?: string): Promise<{
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
            basePrice: Prisma.Decimal | null;
            commissionRate: Prisma.Decimal | null;
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
    }>;
    searchNearby(searchDto: SearchFieldsDto): Promise<{
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
            basePrice?: Prisma.Decimal | null | undefined;
            commissionRate?: Prisma.Decimal | null | undefined;
            ownerId?: string | undefined;
            nameAr?: string | null | undefined;
            descriptionAr?: string | null | undefined;
            addressAr?: string | null | undefined;
            averageRating?: number | null | undefined;
            totalReviews?: number | undefined;
            status?: import(".prisma/client").$Enums.FieldStatus | undefined;
        }[];
        count: number;
    }>;
    isFieldOwner(fieldId: string, userId: string): Promise<boolean>;
    updateField(fieldId: string, ownerId: string, updateFieldDto: UpdateFieldDto): Promise<Field>;
    deleteField(fieldId: string, ownerId: string): Promise<void>;
    uploadImage(fieldId: string, userId: string, file: Express.Multer.File): Promise<FieldImage>;
    deleteImage(fieldId: string, imageId: string, userId: string): Promise<void>;
}
