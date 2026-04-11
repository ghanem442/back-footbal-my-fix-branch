import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { QueryFieldsDto } from './dto/query-fields.dto';
import { SearchFieldsDto } from './dto/search-fields.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Role } from '@prisma/client';
import { I18nService } from '@modules/i18n/i18n.service';
import { FileValidationPipe } from '@common/pipes/file-validation.pipe';

@ApiTags('Fields')
@Controller('fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FieldsController {
  constructor(
    private readonly fieldsService: FieldsService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new field',
    description: 'Field owners can create a new football field with details including location, pricing, and description.',
  })
  @ApiBody({ type: CreateFieldDto })
  @ApiResponse({
    status: 201,
    description: 'Field created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Champions Field',
          description: 'Professional 5-a-side football field',
          address: '123 Sports Street, Cairo',
          latitude: 30.0444,
          longitude: 31.2357,
          basePrice: 200.00,
          averageRating: 0,
          totalReviews: 0,
        },
        message: {
          en: 'Field created successfully',
          ar: 'تم إنشاء الملعب بنجاح',
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only field owners can create fields',
  })
  async createField(
    @CurrentUser('userId') userId: string,
    @Body() createFieldDto: CreateFieldDto,
  ) {
    const field = await this.fieldsService.createField(userId, createFieldDto);

    const message = await this.i18n.getBilingualMessage('field.created');

    return {
      success: true,
      data: field,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all fields',
    description: 'Get paginated list of all fields. Field owners can use myFields=true to see only their own fields.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'myFields', required: false, type: Boolean, description: 'Filter to show only my fields (for field owners)', example: true })
  async getFields(
    @Query() queryDto: QueryFieldsDto,
    @CurrentUser('userId') userId?: string,
  ) {
    console.log('\n========================================');
    console.log('📋 GET FIELDS REQUEST');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Query:', JSON.stringify(queryDto, null, 2));
    console.log('User ID:', userId || 'anonymous');
    console.log('myFields param:', queryDto.myFields);
    console.log('========================================\n');

    const startTime = Date.now();
    
    try {
      // If myFields=true AND user is logged in, filter by current user's fields
      // Otherwise, show all fields
      let filterByOwner: string | undefined = undefined;
      
      if (queryDto.myFields === true) {
        if (userId) {
          filterByOwner = userId;
          console.log('✅ Filtering by owner:', userId);
        } else {
          console.log('⚠️  myFields=true but user not logged in, showing all fields');
        }
      }
      
      const result = await this.fieldsService.findAll(queryDto, filterByOwner);

      const message = await this.i18n.getBilingualMessage('field.listRetrieved');

      const totalTime = Date.now() - startTime;
      console.log('\n========================================');
      console.log('✅ GET FIELDS SUCCESS');
      console.log('========================================');
      console.log('Total Time:', totalTime, 'ms');
      console.log('Fields Returned:', result.data.length);
      console.log('Total Fields:', result.meta.total);
      console.log('========================================\n');

      return {
        success: true,
        data: result.data,
        meta: result.meta,
        message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('\n========================================');
      console.error('❌ GET FIELDS ERROR');
      console.error('========================================');
      console.error('Time before error:', totalTime, 'ms');
      console.error('Error:', error);
      console.error('========================================\n');
      throw error;
    }
  }

  @Public()
  @Get('test-simple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[TEST] Simple database test',
    description: 'Test endpoint to check database connection speed',
  })
  async testSimple() {
    console.log('\n========================================');
    console.log('🧪 TEST SIMPLE QUERY');
    console.log('========================================');
    
    const startTime = Date.now();
    
    try {
      // Just count - simplest possible query
      const count = await this.fieldsService.testSimpleCount();
      const totalTime = Date.now() - startTime;
      
      console.log('✅ Count:', count);
      console.log('✅ Time:', totalTime, 'ms');
      console.log('========================================\n');
      
      return {
        success: true,
        count,
        time: totalTime,
        status: totalTime < 100 ? 'FAST' : totalTime < 500 ? 'OK' : 'SLOW',
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Error:', error);
      console.error('Time:', totalTime, 'ms');
      console.error('========================================\n');
      throw error;
    }
  }

  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Geographic field search',
    description: 'Search for football fields near a location using latitude, longitude, and radius. Public endpoint - no authentication required.',
  })
  @ApiQuery({ name: 'latitude', type: Number, description: 'Latitude coordinate', example: 30.0444 })
  @ApiQuery({ name: 'longitude', type: Number, description: 'Longitude coordinate', example: 31.2357 })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, description: 'Search radius in kilometers (default: 10)', example: 5 })
  @ApiQuery({ name: 'minPrice', type: Number, required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', type: Number, required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'minRating', type: Number, required: false, description: 'Minimum rating filter (1-5)' })
  @ApiResponse({
    status: 200,
    description: 'Fields found successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Champions Field',
            address: '123 Sports Street, Cairo',
            basePrice: 200.00,
            averageRating: 4.5,
            distanceKm: 2.3,
            primaryImage: 'https://example.com/image.jpg',
          },
        ],
        count: 1,
        message: {
          en: 'Search completed successfully',
          ar: 'تم البحث بنجاح',
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async searchFields(@Query() searchDto: SearchFieldsDto) {
    const result = await this.fieldsService.searchNearby(searchDto);

    const message = await this.i18n.getBilingualMessage('field.searchCompleted');

    return {
      success: true,
      data: result.data,
      count: result.count,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFieldById(@Param('id') id: string) {
    const field = await this.fieldsService.getFieldDetails(id);

    const message = await this.i18n.getBilingualMessage('field.retrieved');

    return {
      success: true,
      data: field,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.OK)
  async updateField(
    @CurrentUser('userId') userId: string,
    @Param('id') fieldId: string,
    @Body() updateFieldDto: UpdateFieldDto,
  ) {
    const field = await this.fieldsService.updateField(
      fieldId,
      userId,
      updateFieldDto,
    );

    const message = await this.i18n.getBilingualMessage('field.updated');

    return {
      success: true,
      data: field,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.OK)
  async deleteField(
    @CurrentUser('userId') userId: string,
    @Param('id') fieldId: string,
  ) {
    await this.fieldsService.deleteField(fieldId, userId);

    const message = await this.i18n.getBilingualMessage('field.deleted');

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/images')
  @Roles(Role.FIELD_OWNER)
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload field image',
    description: 'Upload an image for a field. Supports JPEG, PNG, and WebP formats. Maximum file size: 5MB. Field owners can only upload images to their own fields.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Field ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          url: 'https://example.com/uploads/field-image.jpg',
          isPrimary: false,
          order: 1,
        },
        message: {
          en: 'Image uploaded successfully',
          ar: 'تم رفع الصورة بنجاح',
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or size',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only upload images to own fields',
  })
  async uploadImage(
    @CurrentUser('userId') userId: string,
    @Param('id') fieldId: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        await this.i18n.translate('field.noFileProvided'),
      );
    }

    const fieldImage = await this.fieldsService.uploadImage(
      fieldId,
      userId,
      file,
    );

    const message = await this.i18n.getBilingualMessage('field.imageUploaded');

    return {
      success: true,
      data: fieldImage,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.OK)
  async deleteImage(
    @CurrentUser('userId') userId: string,
    @Param('id') fieldId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.fieldsService.deleteImage(fieldId, imageId, userId);

    const message = await this.i18n.getBilingualMessage('field.imageDeleted');

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
