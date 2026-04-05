import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'player@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}
