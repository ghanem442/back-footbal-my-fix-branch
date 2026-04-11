import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { I18nService } from '@modules/i18n/i18n.service';
import { StorageService } from '@modules/storage/storage.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';
import { SearchFieldsDto } from './dto/search-fields.dto';
import { Field, Prisma, FieldImage, BookingStatus, WalletTransactionType } from '@prisma/client';
import { FILE_VALIDATION_CONSTANTS } from '@common/utils/file-validation.util';

@Injectable()
export class FieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Create a new field
   * @param ownerId - ID of the field owner (from JWT token)
   * @param createFieldDto - Field creation data
   * @returns Created field
   */
  async createField(
    ownerId: string,
    createFieldDto: CreateFieldDto,
  ): Promise<Field> {
    // Validate coordinates (additional check beyond DTO validation)
    this.validateCoordinates(
      createFieldDto.latitude,
      createFieldDto.longitude,
    );

    // Create PostGIS Point from coordinates
    // PostGIS uses (longitude, latitude) order - note the swap!
    const pointWKT = `POINT(${createFieldDto.longitude} ${createFieldDto.latitude})`;

    try {
      // Create field with PostGIS geography point
      const field = await this.prisma.$executeRawUnsafe(
        `
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
        `,
        ownerId,
        createFieldDto.name,
        createFieldDto.description,
        createFieldDto.address,
        pointWKT,
        createFieldDto.latitude,
        createFieldDto.longitude,
        createFieldDto.basePrice ?? null,
        createFieldDto.commissionRate ?? null,
      );

      // Fetch the created field
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
        throw new BadRequestException(
          await this.i18n.translate('field.created'),
        );
      }

      return createdField;
    } catch (error) {
      // Handle database errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        await this.i18n.translate('field.invalidCoordinates'),
      );
    }
  }

  /**
   * Validate geographic coordinates
   * @param latitude - Latitude value
   * @param longitude - Longitude value
   * @throws BadRequestException if coordinates are invalid
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }

    // Check for invalid values
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Invalid coordinate values');
    }
  }

  /**
   * Find field by ID
   * @param id - Field ID
   * @returns Field or null
   */
  async findById(id: string): Promise<Field | null> {
    return this.prisma.field.findUnique({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Get field details with images, average rating, and owner info
   * @param id - Field ID
   * @returns Field with related data
   */
  async getFieldDetails(id: string) {
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
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    return field;
  }

  /**
   * Get paginated list of fields with images, average rating, and owner info
   * Can optionally filter by owner ID
   * @param queryDto - Query parameters for pagination
   * @param ownerId - Optional owner ID to filter fields
   * @returns Paginated field list
   */
  async findAll(queryDto: QueryFieldsDto, ownerId?: string) {
    console.log('\n========================================');
    console.log('🔍 FIELDS QUERY START');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Page:', queryDto.page);
    console.log('Limit:', queryDto.limit);
    console.log('Owner ID:', ownerId || 'none');
    console.log('========================================\n');
    
    const totalStartTime = Date.now();
    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { deletedAt: null };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    try {
      // STEP 1: Count
      console.log('🔍 STEP 1: Counting fields...');
      const countStart = Date.now();
      const total = await this.prisma.field.count({ where });
      const countTime = Date.now() - countStart;
      console.log(`✅ STEP 1 DONE: Found ${total} fields (${countTime}ms)\n`);

      // STEP 2: Fetch fields (MINIMAL DATA)
      console.log('🔍 STEP 2: Fetching fields (minimal query)...');
      const queryStart = Date.now();
      
      const fields = await this.prisma.field.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          commissionRate: true,
          averageRating: true,
          totalReviews: true,
          createdAt: true,
          ownerId: true,
          // Minimal image data - only primary image URL
          images: {
            select: {
              url: true,
            },
            where: {
              isPrimary: true,
            },
            take: 1,
          },
          // Minimal owner data
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });
      
      const queryTime = Date.now() - queryStart;
      const totalTime = Date.now() - totalStartTime;
      
      console.log(`✅ STEP 2 DONE: Fetched ${fields.length} fields (${queryTime}ms)\n`);
      console.log('========================================');
      console.log('✅ QUERY COMPLETE');
      console.log('========================================');
      console.log('Count Time:', countTime, 'ms');
      console.log('Query Time:', queryTime, 'ms');
      console.log('TOTAL TIME:', totalTime, 'ms');
      console.log('Fields Returned:', fields.length);
      console.log('Total Fields:', total);
      console.log('========================================\n');

      return {
        data: fields,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      const totalTime = Date.now() - totalStartTime;
      console.error('\n========================================');
      console.error('❌ FIELDS QUERY ERROR');
      console.error('========================================');
      console.error('Time before error:', totalTime, 'ms');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      console.error('Error Stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('========================================\n');
      throw error;
    }
  }

  /**
   * Search for fields within a geographic radius using PostGIS
   * @param searchDto - Search parameters including coordinates, radius, and filters
   * @returns Fields within radius sorted by distance
   */
  async searchNearby(searchDto: SearchFieldsDto) {
    const {
      latitude,
      longitude,
      radiusKm = 10,
      minPrice,
      maxPrice,
      minRating,
    } = searchDto;

    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Build the SQL query with PostGIS functions
    // ST_DWithin checks if a point is within a distance (in meters for geography type)
    // ST_Distance calculates the distance between two points (in meters for geography type)
    const radiusMeters = radiusKm * 1000;

    // Build WHERE conditions
    const conditions: string[] = [
      'f."deletedAt" IS NULL',
      `ST_DWithin(f.location, ST_MakePoint($1, $2)::geography, $3)`,
    ];

    const params: any[] = [longitude, latitude, radiusMeters];
    let paramIndex = 4;

    // Note: basePrice column doesn't exist in schema
    // Price filtering should be done on TimeSlot.price instead
    // Commenting out for now until proper implementation
    // if (minPrice !== undefined) {
    //   conditions.push(`f."basePrice" >= $${paramIndex}`);
    //   params.push(minPrice);
    //   paramIndex++;
    // }

    // if (maxPrice !== undefined) {
    //   conditions.push(`f."basePrice" <= $${paramIndex}`);
    //   params.push(maxPrice);
    //   paramIndex++;
    // }

    if (minRating !== undefined) {
      conditions.push(`f."averageRating" >= $${paramIndex}`);
      params.push(minRating);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Execute raw query to get fields with distance
    // Note: We exclude the 'location' column because Prisma can't deserialize geography type
    const fieldsWithDistance = await this.prisma.$queryRawUnsafe<
      Array<Field & { distance: number }>
    >(
      `
      SELECT 
        f.id, f."ownerId", f.name, f.description, f.address,
        f.latitude, f.longitude, f."commissionRate",
        f."averageRating", f."totalReviews", f."createdAt", f."updatedAt", f."deletedAt",
        ST_Distance(f.location, ST_MakePoint($1, $2)::geography) / 1000 AS distance
      FROM "Field" f
      WHERE ${whereClause}
      ORDER BY distance ASC
      `,
      ...params,
    );

    // Get field IDs for fetching related data
    const fieldIds = fieldsWithDistance.map((f) => f.id);

    if (fieldIds.length === 0) {
      return {
        data: [],
        count: 0,
      };
    }

    // Fetch related data (images and owner info) using Prisma
    const fieldsWithRelations = await this.prisma.field.findMany({
      where: {
        id: { in: fieldIds },
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
          take: 1, // Only get the primary/first image
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

    // Create a map for quick lookup
    const fieldsMap = new Map(
      fieldsWithRelations.map((field) => [field.id, field]),
    );

    // Merge distance data with related data, maintaining distance sort order
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

  /**
   * Check if user owns the field
   * @param fieldId - Field ID
   * @param userId - User ID
   * @returns true if user owns the field
   */
  async isFieldOwner(fieldId: string, userId: string): Promise<boolean> {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId, deletedAt: null },
      select: { ownerId: true },
    });

    return field?.ownerId === userId;
  }

  /**
   * Update a field
   * @param fieldId - Field ID
   * @param ownerId - Owner ID (for ownership validation)
   * @param updateFieldDto - Field update data
   * @returns Updated field
   */
  async updateField(
    fieldId: string,
    ownerId: string,
    updateFieldDto: UpdateFieldDto,
  ): Promise<Field> {
    // Check if field exists and is not deleted
    const field = await this.findById(fieldId);
    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate ownership
    if (field.ownerId !== ownerId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Validate coordinates if provided
    if (updateFieldDto.latitude !== undefined || updateFieldDto.longitude !== undefined) {
      const latitude = updateFieldDto.latitude ?? field.latitude;
      const longitude = updateFieldDto.longitude ?? field.longitude;
      if (latitude !== null && longitude !== null) {
        this.validateCoordinates(latitude, longitude);
      }
    }

    // If coordinates are being updated, we need to update the PostGIS point
    if (updateFieldDto.latitude !== undefined || updateFieldDto.longitude !== undefined) {
      const latitude = updateFieldDto.latitude ?? field.latitude;
      const longitude = updateFieldDto.longitude ?? field.longitude;
      const pointWKT = `POINT(${longitude} ${latitude})`;

      try {
        await this.prisma.$executeRawUnsafe(
          `
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
          `,
          fieldId,
          updateFieldDto.name ?? null,
          updateFieldDto.description ?? null,
          updateFieldDto.address ?? null,
          pointWKT,
          latitude,
          longitude,
          updateFieldDto.commissionRate ?? null,
        );
      } catch (error) {
        throw new BadRequestException(
          await this.i18n.translate('field.updateFailed'),
        );
      }
    } else {
      // No coordinate update, use regular Prisma update
      const updateData: Prisma.FieldUpdateInput = {};
      if (updateFieldDto.name !== undefined) updateData.name = updateFieldDto.name;
      if (updateFieldDto.description !== undefined) updateData.description = updateFieldDto.description;
      if (updateFieldDto.address !== undefined) updateData.address = updateFieldDto.address;
      if (updateFieldDto.commissionRate !== undefined) updateData.commissionRate = updateFieldDto.commissionRate;

      await this.prisma.field.update({
        where: { id: fieldId },
        data: updateData,
      });
    }

    // Fetch and return the updated field
    const updatedField = await this.findById(fieldId);
    if (!updatedField) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    return updatedField;
  }

  /**
   * Soft delete a field and cancel all future bookings with full refunds
   * @param fieldId - Field ID
   * @param ownerId - Owner ID (for ownership validation)
   */
  async deleteField(fieldId: string, ownerId: string): Promise<void> {
    // Check if field exists and is not deleted
    const field = await this.findById(fieldId);
    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate ownership
    if (field.ownerId !== ownerId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Get all future bookings for this field that are pending or confirmed
      // Only cancel bookings that haven't been completed or already cancelled
      const futureBookings = await tx.booking.findMany({
        where: {
          fieldId,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          scheduledDate: {
            gte: new Date(),
          },
        },
        include: {
          timeSlot: true,
        },
      });

      // Cancel all future bookings with full refunds
      for (const booking of futureBookings) {
        if (booking.timeSlot) {
          // Release the time slot
          await tx.timeSlot.update({
            where: { id: booking.timeSlot.id },
            data: { status: 'AVAILABLE' },
          });
        }

        // Update booking status to CANCELLED
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy: ownerId,
            refundAmount: booking.depositAmount,
          },
        });

        // Record status change in history
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: BookingStatus.CANCELLED,
            reason: 'Field deleted by owner - full refund issued',
          },
        });

        // Process full refund to player's wallet
        const playerWallet = await tx.wallet.findUnique({
          where: { userId: booking.playerId },
        });

        if (playerWallet) {
          const refundAmount = Number(booking.depositAmount);
          const balanceBefore = playerWallet.balance;
          const balanceAfter = new Prisma.Decimal(balanceBefore.toString())
            .plus(refundAmount)
            .toDecimalPlaces(2);

          // Update wallet balance
          await tx.wallet.update({
            where: { id: playerWallet.id },
            data: { balance: balanceAfter },
          });

          // Create wallet transaction record
          await tx.walletTransaction.create({
            data: {
              walletId: playerWallet.id,
              type: WalletTransactionType.REFUND,
              amount: new Prisma.Decimal(refundAmount),
              balanceBefore,
              balanceAfter,
              reference: booking.id,
              description: `Full refund for booking ${booking.id} - field deleted`,
            },
          });
        }

        // Reverse field owner wallet credit
        // Field owner was credited: depositAmount - commissionAmount
        // We must debit the same amount to reverse the transaction
        const netAmount = Number(booking.depositAmount) - Number(booking.commissionAmount);
        
        if (netAmount > 0) {
          const fieldOwnerWallet = await tx.wallet.findUnique({
            where: { userId: ownerId },
          });

          if (fieldOwnerWallet) {
            const ownerBalanceBefore = fieldOwnerWallet.balance;
            const ownerBalanceAfter = new Prisma.Decimal(ownerBalanceBefore.toString())
              .minus(netAmount)
              .toDecimalPlaces(2);

            // Validate field owner has sufficient balance
            if (ownerBalanceAfter.lessThan(0)) {
              throw new BadRequestException(
                `Cannot delete field: Insufficient wallet balance to reverse booking ${booking.id}. Field owner needs ${netAmount} but has ${ownerBalanceBefore}`,
              );
            }

            // Update field owner wallet balance
            await tx.wallet.update({
              where: { id: fieldOwnerWallet.id },
              data: { balance: ownerBalanceAfter },
            });

            // Create wallet transaction record
            await tx.walletTransaction.create({
              data: {
                walletId: fieldOwnerWallet.id,
                type: WalletTransactionType.DEBIT,
                amount: new Prisma.Decimal(netAmount),
                balanceBefore: ownerBalanceBefore,
                balanceAfter: ownerBalanceAfter,
                reference: booking.id,
                description: `Reversal for booking ${booking.id} - field deleted`,
              },
            });
          }
        }
      }

      // Soft delete the field
      await tx.field.update({
        where: { id: fieldId },
        data: { deletedAt: new Date() },
      });
    });
  }

  /**
   * Upload an image for a field
   * @param fieldId - Field ID
   * @param userId - User ID (for ownership validation)
   * @param file - Uploaded file
   * @returns Created FieldImage record
   */
  async uploadImage(
    fieldId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<FieldImage> {
    // Check if field exists and is not deleted
    const field = await this.findById(fieldId);
    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate ownership
    if (field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Check current image count
    const currentImageCount = await this.prisma.fieldImage.count({
      where: { fieldId },
    });

    if (currentImageCount >= FILE_VALIDATION_CONSTANTS.MAX_IMAGES_PER_FIELD) {
      throw new BadRequestException(
        await this.i18n.translate('field.maxImagesReached'),
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
    const filename = `field-${fieldId}-${timestamp}-${randomString}.${extension}`;

    // Upload to storage provider
    const imageUrl = await this.storageService.upload(
      file.buffer,
      filename,
      file.mimetype,
    );

    // Determine if this should be the primary image (first image uploaded)
    const isPrimary = currentImageCount === 0;

    // Create FieldImage record
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

  /**
   * Delete a field image
   * @param fieldId - Field ID
   * @param imageId - Image ID
   * @param userId - User ID (for ownership validation)
   */
  async deleteImage(
    fieldId: string,
    imageId: string,
    userId: string,
  ): Promise<void> {
    // Check if field exists and is not deleted
    const field = await this.findById(fieldId);
    if (!field) {
      throw new NotFoundException(
        await this.i18n.translate('field.notFound'),
      );
    }

    // Validate ownership
    if (field.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('field.notOwner'),
      );
    }

    // Find the image
    const image = await this.prisma.fieldImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.fieldId !== fieldId) {
      throw new NotFoundException(
        await this.i18n.translate('field.imageNotFound'),
      );
    }

    // Delete from storage provider (continue even if this fails)
    try {
      await this.storageService.delete(image.url);
    } catch (error) {
      // Log the error but continue with database deletion
      console.error('Failed to delete image from storage:', error);
    }

    // Delete from database
    await this.prisma.fieldImage.delete({
      where: { id: imageId },
    });

    // If deleted image was primary, set another image as primary
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
}

