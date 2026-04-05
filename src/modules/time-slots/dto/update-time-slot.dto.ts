import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({
    description: 'Date for the time slot (ISO 8601)',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Start time in HH:mm format',
    example: '14:00',
  })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format',
    example: '16:00',
  })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Price for the time slot',
    example: 150.00,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price must be a positive number' })
  @Type(() => Number)
  @IsOptional()
  price?: number;
}
