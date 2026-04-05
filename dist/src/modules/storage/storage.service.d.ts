import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { CloudinaryStorageProvider } from './providers/cloudinary-storage.provider';
import { HostingerStorageProvider } from './providers/hostinger-storage.provider';
export declare class StorageService implements StorageProvider {
    private readonly configService;
    private readonly localProvider;
    private readonly s3Provider;
    private readonly cloudinaryProvider;
    private readonly hostingerProvider;
    private readonly logger;
    private readonly provider;
    constructor(configService: ConfigService, localProvider: LocalStorageProvider, s3Provider: S3StorageProvider, cloudinaryProvider: CloudinaryStorageProvider, hostingerProvider: HostingerStorageProvider);
    upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
    delete(url: string): Promise<void>;
    getSignedUrl(url: string, expiresIn: number): Promise<string>;
}
