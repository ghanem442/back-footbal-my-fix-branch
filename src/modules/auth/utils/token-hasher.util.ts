import { createHash, randomBytes } from 'crypto';

/**
 * Token hashing utilities for secure token storage
 */
export class TokenHasher {
  /**
   * Generate a secure random token (plain text)
   * @param bytes - Number of random bytes (default: 32 = 256 bits)
   * @returns Plain text token (hex string)
   */
  static generateToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Hash a token using SHA-256
   * @param token - Plain text token
   * @returns Hashed token (hex string)
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate and hash a token in one step
   * @param bytes - Number of random bytes (default: 32)
   * @returns Object with plain token (to send to user) and hashed token (to store in DB)
   */
  static generateAndHashToken(bytes: number = 32): {
    plainToken: string;
    hashedToken: string;
  } {
    const plainToken = this.generateToken(bytes);
    const hashedToken = this.hashToken(plainToken);
    
    return { plainToken, hashedToken };
  }
}
