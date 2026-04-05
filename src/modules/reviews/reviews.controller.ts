import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto, QueryReviewsDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLAYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a completed booking (Player only)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Booking not completed or invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - not booking owner' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Review already exists for this booking' })
  create(@CurrentUser('userId') userId: string, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(userId, createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get reviews with filtering and pagination' })
  @ApiQuery({ name: 'fieldId', required: false, description: 'Filter by field ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  findAll(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single review by ID' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLAYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review (Player only)' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not review owner' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLAYER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review (Player) or any review (Admin)' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not review owner' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    const isAdmin = userRole === Role.ADMIN;
    return this.reviewsService.remove(id, userId, isAdmin);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FIELD_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review (Field Owner only)' })
  @ApiResponse({ status: 200, description: 'Reply added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not field owner' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() replyReviewDto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, userId, replyReviewDto);
  }
}
