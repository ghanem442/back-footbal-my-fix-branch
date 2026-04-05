import { IsInt, IsString, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking ID to review',
    example: 'clx1234567890abcdefghijk',
  })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Great field! Well maintained and good facilities.',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
