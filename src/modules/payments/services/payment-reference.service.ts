import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';

@Injectable()
export class PaymentReferenceService {
  private readonly nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

  /**
   * Generate a unique payment reference code
   * Format: PAY-XXXXXX (e.g., PAY-8F3K2L)
   */
  generateReferenceCode(): string {
    return `PAY-${this.nanoid()}`;
  }

  /**
   * Validate reference code format
   */
  isValidReferenceCode(code: string): boolean {
    const pattern = /^PAY-[A-Z0-9]{6}$/;
    return pattern.test(code);
  }
}
