import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFieldDto {
  @ApiPropertyOptional({
    description: 'Field name',
    example: 'Champions Stadium',
    minLength: 3,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Field description',
    example: 'Professional football field with night lighting',
    minLength: 10,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Field address',
    example: '123 Sports Street, Cairo, Egypt',
    minLength: 10,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 30.0444,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 31.2357,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Base price per hour',
    example: 150.00,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Base price must be greater than zero' })
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Field-specific commission rate (0-100)',
    example: 30,
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
