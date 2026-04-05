import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({
    description: 'New value for the setting',
    example: '30',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
