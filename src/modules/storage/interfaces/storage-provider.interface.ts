/**
 * Storage Provider Interface
 * 
 * Defines the contract for file storage providers.
 * Implementations can use S3, Cloudinary, local filesystem, or other storage backends.
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param file - File buffer
   * @param filename - Original filename
   * @param mimeType - MIME type of the file
   * @returns Promise resolving to the public URL of the uploaded file
   */
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;

  /**
   * Delete a file from storage
   * @param url - URL or identifier of the file to delete
   * @returns Promise resolving when deletion is complete
   */
  delete(url: string): Promise<void>;

  /**
   * Get a signed URL for temporary access to a file
   * @param url - URL or identifier of the file
   * @param expiresIn - Expiration time in seconds
   * @returns Promise resolving to a signed URL
   */
  getSignedUrl(url: string, expiresIn: number): Promise<string>;
}
