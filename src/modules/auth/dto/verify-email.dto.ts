import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'abc123xyz789def456ghi789jkl012mno345pqr678stu901vwx234',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
