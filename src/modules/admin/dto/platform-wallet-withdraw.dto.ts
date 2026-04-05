import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export enum PayoutMethod {
  MOBILE_WALLET = 'MOBILE_WALLET',
  INSTAPAY = 'INSTAPAY',
}

export enum WalletProvider {
  VODAFONE = 'VODAFONE',
  ORANGE = 'ORANGE',
  ETISALAT = 'ETISALAT',
  WE = 'WE',
}

export class PlatformWalletWithdrawDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number = 0;

  @ApiPropertyOptional({ example: 'Platform withdrawal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'PLATFORM-W-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ enum: PayoutMethod, example: PayoutMethod.MOBILE_WALLET })
  @IsEnum(PayoutMethod)
  payoutMethod: PayoutMethod = PayoutMethod.MOBILE_WALLET;

  // MOBILE_WALLET fields
  @ApiPropertyOptional({ example: '01012345678' })
  @ValidateIf((o) => o.payoutMethod === PayoutMethod.MOBILE_WALLET)
  @IsNotEmpty()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: WalletProvider, example: WalletProvider.VODAFONE })
  @ValidateIf((o) => o.payoutMethod === PayoutMethod.MOBILE_WALLET)
  @IsNotEmpty()
  @IsEnum(WalletProvider)
  walletProvider?: WalletProvider;

  // INSTAPAY fields
  @ApiPropertyOptional({ example: 'name@instapay' })
  @ValidateIf((o) => o.payoutMethod === PayoutMethod.INSTAPAY)
  @IsNotEmpty()
  @IsString()
  accountDetails?: string;

  // Shared
  @ApiProperty({ example: 'Admin Name' })
  @IsNotEmpty()
  @IsString()
  accountHolderName: string = '';
}
