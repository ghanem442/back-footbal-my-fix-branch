/**
 * Interface for OTP delivery channels
 * Abstracts the mechanism for sending OTP codes to users
 */
export interface OtpChannel {
  /**
   * Send an OTP code to the recipient
   * @param recipient - The recipient identifier (phone number or email)
   * @param code - The OTP code to send
   * @returns Promise that resolves when the OTP is sent
   */
  send(recipient: string, code: string): Promise<void>;
}
