"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_VALIDATION_CONSTANTS = exports.ImageMimeType = void 0;
exports.validateImageType = validateImageType;
exports.validateFileSize = validateFileSize;
exports.formatFileSize = formatFileSize;
var ImageMimeType;
(function (ImageMimeType) {
    ImageMimeType["JPEG"] = "image/jpeg";
    ImageMimeType["PNG"] = "image/png";
    ImageMimeType["WEBP"] = "image/webp";
})(ImageMimeType || (exports.ImageMimeType = ImageMimeType = {}));
const FILE_SIGNATURES = {
    JPEG: [0xff, 0xd8, 0xff],
    PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    WEBP_RIFF: [0x52, 0x49, 0x46, 0x46],
    WEBP_WEBP: [0x57, 0x45, 0x42, 0x50],
};
function hasSignature(buffer, signature) {
    if (buffer.length < signature.length) {
        return false;
    }
    for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
            return false;
        }
    }
    return true;
}
function validateImageType(buffer) {
    if (hasSignature(buffer, FILE_SIGNATURES.JPEG)) {
        return ImageMimeType.JPEG;
    }
    if (hasSignature(buffer, FILE_SIGNATURES.PNG)) {
        return ImageMimeType.PNG;
    }
    if (hasSignature(buffer, FILE_SIGNATURES.WEBP_RIFF) &&
        buffer.length >= 12 &&
        hasSignature(buffer.slice(8, 12), FILE_SIGNATURES.WEBP_WEBP)) {
        return ImageMimeType.WEBP;
    }
    return null;
}
function validateFileSize(buffer, maxSizeBytes) {
    return buffer.length <= maxSizeBytes;
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
exports.FILE_VALIDATION_CONSTANTS = {
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
    MAX_IMAGES_PER_FIELD: 10,
    ALLOWED_MIME_TYPES: [
        ImageMimeType.JPEG,
        ImageMimeType.PNG,
        ImageMimeType.WEBP,
    ],
};
//# sourceMappingURL=file-validation.util.js.map