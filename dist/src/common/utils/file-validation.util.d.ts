export declare enum ImageMimeType {
    JPEG = "image/jpeg",
    PNG = "image/png",
    WEBP = "image/webp"
}
export declare function validateImageType(buffer: Buffer): ImageMimeType | null;
export declare function validateFileSize(buffer: Buffer, maxSizeBytes: number): boolean;
export declare function formatFileSize(bytes: number): string;
export declare const FILE_VALIDATION_CONSTANTS: {
    MAX_FILE_SIZE_BYTES: number;
    MAX_IMAGES_PER_FIELD: number;
    ALLOWED_MIME_TYPES: ImageMimeType[];
};
