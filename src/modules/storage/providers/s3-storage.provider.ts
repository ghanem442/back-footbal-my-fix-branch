import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * S3 Storage Provider
 * 
 * Stores files in AWS S3 using the AWS SDK.
 * Provides scalable, durable cloud storage.
 * 
 * Requirements: 24.4
 * 
 * Installation: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: any;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || '';
    this.region = this.configService.get<string>('AWS_S3_REGION', 'us-east-1');
    
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    
    this.isConfigured = !!(this.bucketName && accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      try {
        // Dynamically import AWS SDK
        const { S3Client } = require('@aws-sdk/client-s3');
        
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        
        this.logger.log('S3 storage provider initialized successfully');
      } catch (error) {
        this.logger.warn(
          'AWS SDK not installed. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to use S3 storage: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
        );
        this.isConfigured = false;
      }
    } else {
      this.logger.warn(
        'S3 storage not configured. Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.',
      );
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'S3 storage is not configured. Install @aws-sdk/client-s3 package and configure AWS credentials.',
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
      });
      
      await this.s3Client.send(command);

      // Return public URL
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`File uploaded to S3: ${url}`);

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to S3: ${errorMessage}`);
      throw new Error(`S3 upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(url: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('S3 storage is not configured.');
    }

    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      
      // Extract key from URL
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      await this.s3Client.send(command);

      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file from S3: ${errorMessage}`);
      throw new Error(`S3 deletion failed: ${errorMessage}`);
    }
  }

  /**
   * Get a signed URL for temporary S3 access
   */
  async getSignedUrl(url: string, expiresIn: number): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('S3 storage is not configured.');
    }

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      
      // Extract key from URL
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated signed URL for S3 (expires in ${expiresIn}s)`);

      return signedUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate S3 signed URL: ${errorMessage}`);
      throw new Error(`S3 signed URL generation failed: ${errorMessage}`);
    }
  }
}
