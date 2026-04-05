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
var CloudinaryStorageProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryStorageProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
let CloudinaryStorageProvider = CloudinaryStorageProvider_1 = class CloudinaryStorageProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CloudinaryStorageProvider_1.name);
        this.cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME') || '';
        const apiKey = this.configService.get('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
        this.isConfigured = !!(this.cloudName && apiKey && apiSecret);
        if (this.isConfigured) {
            try {
                const cloudinary = require('cloudinary').v2;
                cloudinary.config({
                    cloud_name: this.cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret,
                });
                this.cloudinary = cloudinary;
                this.logger.log('Cloudinary storage provider initialized successfully');
            }
            catch (error) {
                this.logger.warn('Cloudinary SDK not installed. Install cloudinary package to use Cloudinary storage: npm install cloudinary');
                this.isConfigured = false;
            }
        }
        else {
            this.logger.warn('Cloudinary storage not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
        }
    }
    async upload(file, filename, mimeType) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary storage is not configured. Install cloudinary package and configure Cloudinary credentials.');
        }
        try {
            const publicId = `football-fields/${(0, uuid_1.v4)()}`;
            const result = await this.cloudinary.uploader.upload(`data:${mimeType};base64,${file.toString('base64')}`, {
                public_id: publicId,
                resource_type: 'auto',
            });
            const url = result.secure_url;
            this.logger.log(`File uploaded to Cloudinary: ${url}`);
            return url;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to upload file to Cloudinary: ${errorMessage}`);
            throw new Error(`Cloudinary upload failed: ${errorMessage}`);
        }
    }
    async delete(url) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary storage is not configured.');
        }
        try {
            const publicId = this.extractPublicIdFromUrl(url);
            await this.cloudinary.uploader.destroy(publicId);
            this.logger.log(`File deleted from Cloudinary: ${publicId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete file from Cloudinary: ${errorMessage}`);
            throw new Error(`Cloudinary deletion failed: ${errorMessage}`);
        }
    }
    async getSignedUrl(url, expiresIn) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary storage is not configured.');
        }
        try {
            const publicId = this.extractPublicIdFromUrl(url);
            const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
            const signedUrl = this.cloudinary.url(publicId, {
                sign_url: true,
                type: 'authenticated',
                expires_at: expirationTime,
            });
            this.logger.log(`Generated signed URL for Cloudinary (expires in ${expiresIn}s)`);
            return signedUrl;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to generate Cloudinary signed URL: ${errorMessage}`);
            throw new Error(`Cloudinary signed URL generation failed: ${errorMessage}`);
        }
    }
    extractPublicIdFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const uploadIndex = pathParts.indexOf('upload');
            if (uploadIndex === -1) {
                throw new Error('Invalid Cloudinary URL format');
            }
            const publicIdParts = pathParts.slice(uploadIndex + 1);
            if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
                publicIdParts.shift();
            }
            const publicIdWithExt = publicIdParts.join('/');
            const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
            return publicId;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract public ID from URL: ${errorMessage}`);
        }
    }
};
exports.CloudinaryStorageProvider = CloudinaryStorageProvider;
exports.CloudinaryStorageProvider = CloudinaryStorageProvider = CloudinaryStorageProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryStorageProvider);
//# sourceMappingURL=cloudinary-storage.provider.js.map