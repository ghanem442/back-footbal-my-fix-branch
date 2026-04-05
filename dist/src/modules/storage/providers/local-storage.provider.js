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
var LocalStorageProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
let LocalStorageProvider = LocalStorageProvider_1 = class LocalStorageProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(LocalStorageProvider_1.name);
        this.uploadDir = this.configService.get('STORAGE_LOCAL_PATH', './uploads');
        this.baseUrl = this.configService.get('STORAGE_LOCAL_BASE_URL', 'http://localhost:3000/uploads');
    }
    async upload(file, filename, mimeType) {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            const ext = path.extname(filename);
            const uniqueFilename = `${(0, uuid_1.v4)()}${ext}`;
            const filePath = path.join(this.uploadDir, uniqueFilename);
            await fs.writeFile(filePath, file);
            const url = `${this.baseUrl}/${uniqueFilename}`;
            this.logger.log(`File uploaded to local storage: ${url}`);
            return url;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to upload file to local storage: ${errorMessage}`);
            throw new Error(`Local storage upload failed: ${errorMessage}`);
        }
    }
    async delete(url) {
        try {
            const filename = url.split('/').pop();
            if (!filename) {
                throw new Error('Invalid URL format');
            }
            const filePath = path.join(this.uploadDir, filename);
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
                this.logger.log(`File deleted from local storage: ${filename}`);
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    this.logger.warn(`File not found for deletion: ${filename}`);
                    return;
                }
                throw error;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete file from local storage: ${errorMessage}`);
            throw new Error(`Local storage deletion failed: ${errorMessage}`);
        }
    }
    async getSignedUrl(url, expiresIn) {
        const expirationTime = Date.now() + expiresIn * 1000;
        const signedUrl = `${url}?expires=${expirationTime}`;
        this.logger.log(`Generated signed URL for local storage (expires in ${expiresIn}s)`);
        return signedUrl;
    }
};
exports.LocalStorageProvider = LocalStorageProvider;
exports.LocalStorageProvider = LocalStorageProvider = LocalStorageProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageProvider);
//# sourceMappingURL=local-storage.provider.js.map