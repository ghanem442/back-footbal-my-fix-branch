"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_provider_1 = require("./providers/local-storage.provider");
const s3_storage_provider_1 = require("./providers/s3-storage.provider");
const cloudinary_storage_provider_1 = require("./providers/cloudinary-storage.provider");
const hostinger_storage_provider_1 = require("./providers/hostinger-storage.provider");
let StorageService = StorageService_1 = class StorageService {
    constructor(configService, localProvider, s3Provider, cloudinaryProvider, hostingerProvider) {
        this.configService = configService;
        this.localProvider = localProvider;
        this.s3Provider = s3Provider;
        this.cloudinaryProvider = cloudinaryProvider;
        this.hostingerProvider = hostingerProvider;
        this.logger = new common_1.Logger(StorageService_1.name);
        const providerType = this.configService.get('STORAGE_PROVIDER', 'local').toLowerCase();
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
                this.logger.warn(`Unknown storage provider: ${providerType}. Falling back to local storage.`);
                this.provider = this.localProvider;
        }
    }
    async upload(file, filename, mimeType) {
        return this.provider.upload(file, filename, mimeType);
    }
    async delete(url) {
        return this.provider.delete(url);
    }
    async getSignedUrl(url, expiresIn) {
        return this.provider.getSignedUrl(url, expiresIn);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        local_storage_provider_1.LocalStorageProvider,
        s3_storage_provider_1.S3StorageProvider,
        cloudinary_storage_provider_1.CloudinaryStorageProvider,
        hostinger_storage_provider_1.HostingerStorageProvider])
], StorageService);
//# sourceMappingURL=storage.service.js.map