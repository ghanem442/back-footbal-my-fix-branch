import { IsString, IsBoolean, IsOptional, IsIn, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentAccountDto {
  @ApiProperty({
    description: 'Payment method type',
    enum: ['VODAFONE_CASH', 'INSTAPAY'],
    example: 'VODAFONE_CASH',
  })
  @IsString()
  @IsIn(['VODAFONE_CASH', 'INSTAPAY'])
  paymentMethod!: string;

  @ApiPropertyOptional({
    description: 'Vodafone Cash account number (required for VODAFONE_CASH)',
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.paymentMethod === 'VODAFONE_CASH')
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'InstaPay account name (required for INSTAPAY)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.paymentMethod === 'INSTAPAY')
  accountName?: string;

  @ApiPropertyOptional({
    description: 'InstaPay mobile number (required for INSTAPAY)',
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.paymentMethod === 'INSTAPAY')
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'InstaPay Payment Address (IPN)',
    example: 'johndoe@instapay',
  })
  @IsOptional()
  @IsString()
  ipn?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (optional)',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Whether this payment method is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaymentAccountDto {
  @ApiPropertyOptional({
    description: 'Vodafone Cash account number',
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'InstaPay account name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({
    description: 'InstaPay mobile number',
    example: '01012345678',
  })
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'InstaPay Payment Address (IPN)',
    example: 'johndoe@instapay',
  })
  @IsOptional()
  @IsString()
  ipn?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Whether this payment method is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
