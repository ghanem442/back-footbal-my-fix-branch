import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cloudinary Storage Provider
 * 
 * Stores files in Cloudinary using the Cloudinary SDK.
 * Provides image optimization and transformation capabilities.
 * 
 * Requirements: 24.5
 * 
 * Installation: npm install cloudinary
 */
@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);
  private readonly cloudinary: any;
  private readonly cloudName: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    
    this.isConfigured = !!(this.cloudName && apiKey && apiSecret);

    if (this.isConfigured) {
      try {
        // Dynamically import Cloudinary SDK
        const cloudinary = require('cloudinary').v2;
        
        cloudinary.config({
          cloud_name: this.cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        });
        
        this.cloudinary = cloudinary;
        this.logger.log('Cloudinary storage provider initialized successfully');
      } catch (error) {
        this.logger.warn(
          'Cloudinary SDK not installed. Install cloudinary package to use Cloudinary storage: npm install cloudinary',
        );
        this.isConfigured = false;
      }
    } else {
      this.logger.warn(
        'Cloudinary storage not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }
  }

  /**
   * Upload a file to Cloudinary
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'Cloudinary storage is not configured. Install cloudinary package and configure Cloudinary credentials.',
      );
    }

    try {
      // Generate unique public ID
      const publicId = `football-fields/${uuidv4()}`;

      const result = await this.cloudinary.uploader.upload(
        `data:${mimeType};base64,${file.toString('base64')}`,
        {
          public_id: publicId,
          resource_type: 'auto',
        },
      );

      // Return secure URL
      const url = result.secure_url;
      this.logger.log(`File uploaded to Cloudinary: ${url}`);

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to Cloudinary: ${errorMessage}`);
      throw new Error(`Cloudinary upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  async delete(url: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary storage is not configured.');
    }

    try {
      // Extract public ID from URL
      const publicId = this.extractPublicIdFromUrl(url);

      await this.cloudinary.uploader.destroy(publicId);

      this.logger.log(`File deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file from Cloudinary: ${errorMessage}`);
      throw new Error(`Cloudinary deletion failed: ${errorMessage}`);
    }
  }

  /**
   * Get a signed URL for temporary Cloudinary access
   */
  async getSignedUrl(url: string, expiresIn: number): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary storage is not configured.');
    }

    try {
      // Extract public ID from URL
      const publicId = this.extractPublicIdFromUrl(url);

      // Calculate expiration timestamp
      const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

      const signedUrl = this.cloudinary.url(publicId, {
        sign_url: true,
        type: 'authenticated',
        expires_at: expirationTime,
      });

      this.logger.log(`Generated signed URL for Cloudinary (expires in ${expiresIn}s)`);

      return signedUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate Cloudinary signed URL: ${errorMessage}`);
      throw new Error(`Cloudinary signed URL generation failed: ${errorMessage}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Find the index of 'upload' in the path
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL format');
      }

      // Public ID is everything after 'upload' and version (if present)
      const publicIdParts = pathParts.slice(uploadIndex + 1);
      
      // Remove version if present (starts with 'v' followed by numbers)
      if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
        publicIdParts.shift();
      }

      // Join remaining parts and remove file extension
      const publicIdWithExt = publicIdParts.join('/');
      const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

      return publicId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract public ID from URL: ${errorMessage}`);
    }
  }
}
