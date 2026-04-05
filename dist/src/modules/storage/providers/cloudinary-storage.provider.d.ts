import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
export declare class CloudinaryStorageProvider implements StorageProvider {
    private readonly configService;
    private readonly logger;
    private readonly cloudinary;
    private readonly cloudName;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
    delete(url: string): Promise<void>;
    getSignedUrl(url: string, expiresIn: number): Promise<string>;
    private extractPublicIdFromUrl;
}
