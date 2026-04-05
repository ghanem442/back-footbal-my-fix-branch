import { IsNumber, Min, IsString, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WithdrawalMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_WALLET = 'MOBILE_WALLET',
  STRIPE_CONNECT = 'STRIPE_CONNECT',
  FAWRY_PAYOUT = 'FAWRY_PAYOUT',
  VODAFONE_CASH = 'VODAFONE_CASH',
  INSTAPAY = 'INSTAPAY',
}

export enum WithdrawalGateway {
  STRIPE = 'stripe',
  FAWRY = 'fawry',
  VODAFONE = 'vodafone',
  INSTAPAY = 'instapay',
}

export class BankAccountDetailsDto {
  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank code or routing number' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'IBAN (International Bank Account Number)' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsOptional()
  @IsString()
  swiftCode?: string;
}

export class MobileWalletDetailsDto {
  @ApiProperty({ description: 'Mobile phone number' })
  @IsString()
  phoneNumber!: string;

  @ApiPropertyOptional({ description: 'Wallet provider name' })
  @IsOptional()
  @IsString()
  walletProvider?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ProcessWithdrawalDto {
  @ApiProperty({ description: 'Amount to withdraw', example: 100.00, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ 
    description: 'Withdrawal method',
    enum: WithdrawalMethod,
    example: WithdrawalMethod.BANK_TRANSFER
  })
  @IsEnum(WithdrawalMethod)
  method!: WithdrawalMethod;

  @ApiProperty({ 
    description: 'Payment gateway to use',
    enum: WithdrawalGateway,
    example: WithdrawalGateway.STRIPE
  })
  @IsEnum(WithdrawalGateway)
  gateway!: WithdrawalGateway;

  @ApiPropertyOptional({ 
    description: 'Bank account details (required for bank transfers)',
    type: BankAccountDetailsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDetailsDto)
  bankDetails?: BankAccountDetailsDto;

  @ApiPropertyOptional({ 
    description: 'Mobile wallet details (required for mobile wallet withdrawals)',
    type: MobileWalletDetailsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MobileWalletDetailsDto)
  mobileWalletDetails?: MobileWalletDetailsDto;

  @ApiPropertyOptional({ description: 'Stripe connected account ID (for Stripe Connect)' })
  @IsOptional()
  @IsString()
  stripeConnectedAccountId?: string;
}
