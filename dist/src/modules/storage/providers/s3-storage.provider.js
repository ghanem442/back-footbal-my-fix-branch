"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var S3StorageProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
let S3StorageProvider = S3StorageProvider_1 = class S3StorageProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(S3StorageProvider_1.name);
        this.bucketName = this.configService.get('AWS_S3_BUCKET') || '';
        this.region = this.configService.get('AWS_S3_REGION', 'us-east-1');
        const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
        this.isConfigured = !!(this.bucketName && accessKeyId && secretAccessKey);
        if (this.isConfigured) {
            try {
                const { S3Client } = require('@aws-sdk/client-s3');
                this.s3Client = new S3Client({
                    region: this.region,
                    credentials: {
                        accessKeyId,
                        secretAccessKey,
                    },
                });
                this.logger.log('S3 storage provider initialized successfully');
            }
            catch (error) {
                this.logger.warn('AWS SDK not installed. Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to use S3 storage: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
                this.isConfigured = false;
            }
        }
        else {
            this.logger.warn('S3 storage not configured. Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.');
        }
    }
    async upload(file, filename, mimeType) {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured. Install @aws-sdk/client-s3 package and configure AWS credentials.');
        }
        try {
            const { PutObjectCommand } = require('@aws-sdk/client-s3');
            const ext = path.extname(filename);
            const key = `uploads/${(0, uuid_1.v4)()}${ext}`;
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file,
                ContentType: mimeType,
            });
            await this.s3Client.send(command);
            const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
            this.logger.log(`File uploaded to S3: ${url}`);
            return url;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to upload file to S3: ${errorMessage}`);
            throw new Error(`S3 upload failed: ${errorMessage}`);
        }
    }
    async delete(url) {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured.');
        }
        try {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            const urlObj = new URL(url);
            const key = urlObj.pathname.substring(1);
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            this.logger.log(`File deleted from S3: ${key}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete file from S3: ${errorMessage}`);
            throw new Error(`S3 deletion failed: ${errorMessage}`);
        }
    }
    async getSignedUrl(url, expiresIn) {
        if (!this.isConfigured) {
            throw new Error('S3 storage is not configured.');
        }
        try {
            const { GetObjectCommand } = require('@aws-sdk/client-s3');
            const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to generate S3 signed URL: ${errorMessage}`);
            throw new Error(`S3 signed URL generation failed: ${errorMessage}`);
        }
    }
};
exports.S3StorageProvider = S3StorageProvider;
exports.S3StorageProvider = S3StorageProvider = S3StorageProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3StorageProvider);
//# sourceMappingURL=s3-storage.provider.js.map