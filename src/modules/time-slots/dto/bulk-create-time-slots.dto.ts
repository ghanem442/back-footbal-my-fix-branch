import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TimeRangeDto {
  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '14:00',
  })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '16:00',
  })
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({
    description: 'Price for this time range',
    example: 150.00,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price must be a positive number' })
  @Type(() => Number)
  price!: number;
}

export class BulkCreateTimeSlotsDto {
  @ApiProperty({
    description: 'Field ID to create time slots for',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  fieldId!: string;

  @ApiProperty({
    description: 'Start date for bulk creation (ISO 8601)',
    example: '2024-03-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({
    description: 'End date for bulk creation (ISO 8601)',
    example: '2024-03-31',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({
    description: 'Days of week to create slots (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one day must be specified' })
  @IsNumber({}, { each: true })
  @Min(0, { each: true, message: 'Day must be between 0 (Sunday) and 6 (Saturday)' })
  @Type(() => Number)
  daysOfWeek!: number[];

  @ApiProperty({
    description: 'Time ranges with prices for each slot',
    type: [TimeRangeDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one time range must be specified' })
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  timeRanges!: TimeRangeDto[];
}
