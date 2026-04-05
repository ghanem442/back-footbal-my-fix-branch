import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Local Storage Provider
 * 
 * Stores files in the local filesystem and serves them via static endpoint.
 * Suitable for development and small-scale deployments.
 * 
 * Requirements: 24.6
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>(
      'STORAGE_LOCAL_PATH',
      './uploads',
    );
    this.baseUrl = this.configService.get<string>(
      'STORAGE_LOCAL_BASE_URL',
      'http://localhost:3000/uploads',
    );
  }

  /**
   * Upload a file to local filesystem
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    try {
      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Generate unique filename to prevent collisions
      const ext = path.extname(filename);
      const uniqueFilename = `${uuidv4()}${ext}`;
      const filePath = path.join(this.uploadDir, uniqueFilename);

      // Write file to disk
      await fs.writeFile(filePath, file);

      // Return public URL
      const url = `${this.baseUrl}/${uniqueFilename}`;
      this.logger.log(`File uploaded to local storage: ${url}`);

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to local storage: ${errorMessage}`);
      throw new Error(`Local storage upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from local filesystem
   */
  async delete(url: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = url.split('/').pop();
      if (!filename) {
        throw new Error('Invalid URL format');
      }

      const filePath = path.join(this.uploadDir, filename);

      // Check if file exists before attempting deletion
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        this.logger.log(`File deleted from local storage: ${filename}`);
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          this.logger.warn(`File not found for deletion: ${filename}`);
          return; // File doesn't exist, consider it deleted
        }
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file from local storage: ${errorMessage}`);
      throw new Error(`Local storage deletion failed: ${errorMessage}`);
    }
  }

  /**
   * Get a signed URL for local storage
   * Note: Local storage doesn't support true signed URLs,
   * so this returns the original URL with a query parameter
   */
  async getSignedUrl(url: string, expiresIn: number): Promise<string> {
    // For local storage, we don't have true signed URLs
    // Return the URL with an expiration timestamp as a query parameter
    const expirationTime = Date.now() + expiresIn * 1000;
    const signedUrl = `${url}?expires=${expirationTime}`;
    
    this.logger.log(`Generated signed URL for local storage (expires in ${expiresIn}s)`);
    return signedUrl;
  }
}
