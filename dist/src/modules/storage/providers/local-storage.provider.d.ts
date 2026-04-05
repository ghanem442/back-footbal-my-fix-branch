import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
export declare class LocalStorageProvider implements StorageProvider {
    private readonly configService;
    private readonly logger;
    private readonly uploadDir;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
    delete(url: string): Promise<void>;
    getSignedUrl(url: string, expiresIn: number): Promise<string>;
}
