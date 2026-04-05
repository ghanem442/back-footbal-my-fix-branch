import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider';
import { HostingerStorageProvider } from './providers/hostinger-storage.provider';

/**
 * Storage Service
 * 
 * Factory service that selects and provides the appropriate storage provider
 * based on environment configuration.
 * 
 * Supported providers:
 * - local: Local filesystem storage
 * - s3: AWS S3 storage
 * - cloudinary: Cloudinary storage
 * - hostinger: Hostinger Object Storage (S3-compatible)
 * 
 * Requirements: 24.4, 24.5, 24.6
 */
@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
    private readonly cloudinaryProvider: CloudinaryStorageProvider,
    private readonly hostingerProvider: HostingerStorageProvider,
  ) {
    const providerType = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'local',
    ).toLowerCase();

    // Select provider based on configuration
    switch (providerType) {
      case 'local':
        this.provider = this.localProvider;
        this.logger.log('Using Local Storage Provider');
        break;
      case 's3':
        this.provider = this.s3Provider;
        this.logger.log('Using S3 Storage Provider');
        break;
      case 'cloudinary':
        this.provider = this.cloudinaryProvider;
        this.logger.log('Using Cloudinary Storage Provider');
        break;
      case 'hostinger':
        this.provider = this.hostingerProvider;
        this.logger.log('Using Hostinger Object Storage Provider');
        break;
      default:
        this.logger.warn(
          `Unknown storage provider: ${providerType}. Falling back to local storage.`,
        );
        this.provider = this.localProvider;
    }
  }

  /**
   * Upload a file using the configured storage provider
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    return this.provider.upload(file, filename, mimeType);
  }

  /**
   * Delete a file using the configured storage provider
   */
  async delete(url: string): Promise<void> {
    return this.provider.delete(url);
  }

  /**
   * Get a signed URL using the configured storage provider
   */
  async getSignedUrl(url: string, expiresIn: number): Promise<string> {
    return this.provider.getSignedUrl(url, expiresIn);
  }
}
