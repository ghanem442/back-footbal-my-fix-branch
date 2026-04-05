import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreatePaymentAccountDto, UpdatePaymentAccountDto } from './dto/payment-account-settings.dto';

@Injectable()
export class PaymentAccountSettingsService {
  private readonly logger = new Logger(PaymentAccountSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update payment account settings
   */
  async upsertPaymentAccount(dto: CreatePaymentAccountDto) {
    // Validate required fields based on payment method
    if (dto.paymentMethod === 'VODAFONE_CASH' && !dto.accountNumber) {
      throw new BadRequestException('Account number is required for Vodafone Cash');
    }

    if (dto.paymentMethod === 'INSTAPAY' && (!dto.accountName || !dto.mobileNumber)) {
      throw new BadRequestException('Account name and mobile number are required for InstaPay');
    }

    const account = await this.prisma.paymentAccountSettings.upsert({
      where: { paymentMethod: dto.paymentMethod },
      update: {
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        mobileNumber: dto.mobileNumber,
        ipn: dto.ipn,
        bankAccount: dto.bankAccount,
        isActive: dto.isActive ?? true,
        updatedAt: new Date(),
      },
      create: {
        paymentMethod: dto.paymentMethod,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        mobileNumber: dto.mobileNumber,
        ipn: dto.ipn,
        bankAccount: dto.bankAccount,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Payment account settings ${dto.paymentMethod} upserted`);

    return account;
  }

  /**
   * Create payment account (alias for upsert)
   */
  async createAccount(dto: CreatePaymentAccountDto) {
    return this.upsertPaymentAccount(dto);
  }

  /**
   * Update payment account by ID
   */
  async updateAccount(id: string, dto: UpdatePaymentAccountDto) {
    const existing = await this.prisma.paymentAccountSettings.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Payment account not found`);
    }

    const account = await this.prisma.paymentAccountSettings.update({
      where: { id },
      data: {
        accountNumber: dto.accountNumber ?? existing.accountNumber,
        accountName: dto.accountName ?? existing.accountName,
        mobileNumber: dto.mobileNumber ?? existing.mobileNumber,
        ipn: dto.ipn ?? existing.ipn,
        bankAccount: dto.bankAccount ?? existing.bankAccount,
        isActive: dto.isActive ?? existing.isActive,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Payment account ${id} updated`);

    return account;
  }

  /**
   * Get all payment accounts (alias)
   */
  async getAllAccounts() {
    return this.getAllPaymentAccounts();
  }

  /**
   * Delete payment account by ID
   */
  async deleteAccount(id: string) {
    const existing = await this.prisma.paymentAccountSettings.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Payment account not found`);
    }

    await this.prisma.paymentAccountSettings.delete({
      where: { id },
    });

    this.logger.log(`Payment account ${id} deleted`);

    return { deleted: true };
  }

  /**
   * Create or update payment account settings
   */
  async upsertPaymentAccountOld(dto: CreatePaymentAccountDto) {
    // Validate required fields based on payment method
    if (dto.paymentMethod === 'VODAFONE_CASH' && !dto.accountNumber) {
      throw new BadRequestException('Account number is required for Vodafone Cash');
    }

    if (dto.paymentMethod === 'INSTAPAY' && (!dto.accountName || !dto.mobileNumber)) {
      throw new BadRequestException('Account name and mobile number are required for InstaPay');
    }

    const account = await this.prisma.paymentAccountSettings.upsert({
      where: { paymentMethod: dto.paymentMethod },
      update: {
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        mobileNumber: dto.mobileNumber,
        isActive: dto.isActive ?? true,
        updatedAt: new Date(),
      },
      create: {
        paymentMethod: dto.paymentMethod,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        mobileNumber: dto.mobileNumber,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Payment account settings ${dto.paymentMethod} upserted`);

    return account;
  }

  /**
   * Update payment account settings
   */
  async updatePaymentAccount(paymentMethod: string, dto: UpdatePaymentAccountDto) {
    const existing = await this.prisma.paymentAccountSettings.findUnique({
      where: { paymentMethod },
    });

    if (!existing) {
      throw new NotFoundException(`Payment account settings for ${paymentMethod} not found`);
    }

    const account = await this.prisma.paymentAccountSettings.update({
      where: { paymentMethod },
      data: {
        accountNumber: dto.accountNumber ?? existing.accountNumber,
        accountName: dto.accountName ?? existing.accountName,
        mobileNumber: dto.mobileNumber ?? existing.mobileNumber,
        isActive: dto.isActive ?? existing.isActive,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Payment account settings ${paymentMethod} updated`);

    return account;
  }

  /**
   * Get all payment account settings
   */
  async getAllPaymentAccounts() {
    return this.prisma.paymentAccountSettings.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get payment account settings by method
   */
  async getPaymentAccount(paymentMethod: string) {
    const account = await this.prisma.paymentAccountSettings.findUnique({
      where: { paymentMethod },
    });

    if (!account) {
      throw new NotFoundException(`Payment account settings for ${paymentMethod} not found`);
    }

    return account;
  }

  /**
   * Get active payment account settings by method (for players)
   */
  async getActivePaymentAccount(paymentMethod: string) {
    const account = await this.prisma.paymentAccountSettings.findFirst({
      where: {
        paymentMethod,
        isActive: true,
      },
    });

    return account;
  }

  /**
   * Delete payment account settings
   */
  async deletePaymentAccount(paymentMethod: string) {
    const existing = await this.prisma.paymentAccountSettings.findUnique({
      where: { paymentMethod },
    });

    if (!existing) {
      throw new NotFoundException(`Payment account settings for ${paymentMethod} not found`);
    }

    await this.prisma.paymentAccountSettings.delete({
      where: { paymentMethod },
    });

    this.logger.log(`Payment account settings ${paymentMethod} deleted`);

    return { deleted: true };
  }
}
