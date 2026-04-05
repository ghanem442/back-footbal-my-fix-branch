import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * Hostinger Object Storage Provider
 * 
 * Stores files in Hostinger Object Storage using S3-compatible API.
 * Provides cost-effective cloud storage with S3 compatibility.
 * 
 * Requirements: 24.4
 * 
 * Installation: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 
 * Note: Hostinger Object Storage is S3-compatible, so we use the AWS SDK
 * with custom endpoint configuration.
 */
@Injectable()
export class HostingerStorageProvider implements StorageProvider {
  private readonly logger = new Logger(HostingerStorageProvider.name);
  private readonly s3Client: any;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly publicUrl: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('HOSTINGER_BUCKET') || '';
    this.region = this.configService.get<string>('HOSTINGER_REGION', 'auto');
    this.publicUrl = this.configService.get<string>('HOSTINGER_PUBLIC_URL') || '';
    
    const endpoint = this.configService.get<string>('HOSTINGER_ENDPOINT');
    const accessKeyId = this.configService.get<string>('HOSTINGER_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('HOSTINGER_SECRET_KEY');
    
    this.isConfigured = !!(this.bucketName && endpoint && accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      try {
        // Dynamically import AWS SDK (works with S3-compatible services)
        const { S3Client } = require('@aws-sdk/client-s3');
        
        this.s3Client = new S3Client({
          endpoint,
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: true, // Required for S3-compatible services
        });
        
        this.logger.log('Hostinger Object Storage provider initialized successfully');
      } catch (error) {
        this.logger.warn(
          'AWS SDK not installed. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to use Hostinger storage: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
        );
        this.isConfigured = false;
      }
    } else {
      this.logger.warn(
        'Hostinger Object Storage not configured. Set HOSTINGER_ENDPOINT, HOSTINGER_BUCKET, HOSTINGER_ACCESS_KEY, and HOSTINGER_SECRET_KEY environment variables.',
      );
    }
  }

  /**
   * Upload a file to Hostinger Object Storage
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'Hostinger Object Storage is not configured. Install @aws-sdk/client-s3 package and configure Hostinger credentials.',
      );
    }

    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      
      // Generate unique key to prevent collisions
      const ext = path.extname(filename);
      const key = `uploads/${uuidv4()}${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType,
        ACL: 'public-read', // Make file publicly accessible
      });
      
      await this.s3Client.send(command);

      // Return public URL
      const url = this.publicUrl 
        ? `${this.publicUrl}/${key}`
        : `${this.configService.get('HOSTINGER_ENDPOINT')}/${this.bucketName}/${key}`;
      
      this.logger.log(`File uploaded to Hostinger: ${url}`);

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to Hostinger: ${errorMessage}`);
      throw new Error(`Hostinger upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from Hostinger Object Storage
   */
  async delete(url: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Hostinger Object Storage is not configured.');
    }

    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      
      // Extract key from URL
      let key: string;
      if (this.publicUrl && url.startsWith(this.publicUrl)) {
        key = url.replace(`${this.publicUrl}/`, '');
      } else {
        const urlObj = new URL(url);
        key = urlObj.pathname.substring(1); // Remove leading slash
        // Remove bucket name if present in path
        if (key.startsWith(`${this.bucketName}/`)) {
          key = key.substring(this.bucketName.length + 1);
        }
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      await this.s3Client.send(command);

      this.logger.log(`File deleted from Hostinger: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file from Hostinger: ${errorMessage}`);
      throw new Error(`Hostinger deletion failed: ${errorMessage}`);
    }
  }

  /**
   * Get a signed URL for temporary access to Hostinger Object Storage
   */
  async getSignedUrl(url: string, expiresIn: number): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Hostinger Object Storage is not configured.');
    }

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      
      // Extract key from URL
      let key: string;
      if (this.publicUrl && url.startsWith(this.publicUrl)) {
        key = url.replace(`${this.publicUrl}/`, '');
      } else {
        const urlObj = new URL(url);
        key = urlObj.pathname.substring(1);
        // Remove bucket name if present in path
        if (key.startsWith(`${this.bucketName}/`)) {
          key = key.substring(this.bucketName.length + 1);
        }
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated signed URL for Hostinger (expires in ${expiresIn}s)`);

      return signedUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate Hostinger signed URL: ${errorMessage}`);
      throw new Error(`Hostinger signed URL generation failed: ${errorMessage}`);
    }
  }
}
