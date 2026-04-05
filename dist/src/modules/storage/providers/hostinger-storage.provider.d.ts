import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
export declare class HostingerStorageProvider implements StorageProvider {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly region;
    private readonly publicUrl;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
    delete(url: string): Promise<void>;
    getSignedUrl(url: string, expiresIn: number): Promise<string>;
}
