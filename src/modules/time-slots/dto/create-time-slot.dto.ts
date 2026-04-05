import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimeSlotDto {
  @ApiProperty({
    description: 'Field ID to create time slot for',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  fieldId!: string;

  @ApiProperty({
    description: 'Date for the time slot (ISO 8601)',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

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
    description: 'Price for the time slot',
    example: 150.00,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price must be a positive number' })
  @Type(() => Number)
  price!: number;
}
