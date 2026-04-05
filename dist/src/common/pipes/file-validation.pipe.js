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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const file_validation_util_1 = require("../utils/file-validation.util");
let FileValidationPipe = class FileValidationPipe {
    constructor(errorMessage) {
        this.errorMessage = errorMessage;
    }
    transform(file) {
        if (!file) {
            throw new common_1.BadRequestException(this.errorMessage || 'No file provided');
        }
        if (!(0, file_validation_util_1.validateFileSize)(file.buffer, file_validation_util_1.FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES)) {
            throw new common_1.BadRequestException(`File size exceeds ${(0, file_validation_util_1.formatFileSize)(file_validation_util_1.FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES)} limit`);
        }
        const detectedMimeType = (0, file_validation_util_1.validateImageType)(file.buffer);
        if (!detectedMimeType) {
            throw new common_1.BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
        }
        file.mimetype = detectedMimeType;
        return file;
    }
};
exports.FileValidationPipe = FileValidationPipe;
exports.FileValidationPipe = FileValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], FileValidationPipe);
//# sourceMappingURL=file-validation.pipe.js.map