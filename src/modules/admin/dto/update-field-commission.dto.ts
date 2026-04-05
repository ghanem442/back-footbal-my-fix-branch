import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFieldCommissionDto {
  @ApiPropertyOptional({
    description: 'Field-specific commission rate percentage (0-100). Set to null to use global rate.',
    example: 30,
    minimum: 0,
    maximum: 100,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate!: number | null;
}
