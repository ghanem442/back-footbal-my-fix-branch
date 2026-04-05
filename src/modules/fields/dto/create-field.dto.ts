import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFieldDto {
  @ApiProperty({
    description: 'Field name',
    example: 'Champions Field',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Field description',
    example: 'Professional 5-a-side football field with artificial turf and floodlights',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @ApiProperty({
    description: 'Field address',
    example: '123 Sports Street, Nasr City, Cairo',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  address!: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 30.0444,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @Type(() => Number)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 31.2357,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @Type(() => Number)
  longitude!: number;

  @ApiPropertyOptional({
    description: 'Base price per hour in EGP (deprecated - use TimeSlot price instead)',
    example: 200.00,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Base price must be greater than zero' })
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Custom commission rate for this field (overrides global rate)',
    example: 15.00,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Commission rate must be between 0 and 100' })
  @Max(100, { message: 'Commission rate must be between 0 and 100' })
  @Type(() => Number)
  commissionRate?: number;
}
