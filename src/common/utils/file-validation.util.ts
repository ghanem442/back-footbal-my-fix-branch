/**
 * File Validation Utilities
 * 
 * Provides utilities for validating file types using magic bytes (file signatures)
 * and file size validation.
 * 
 * Requirements: 24.1, 24.2, 24.3
 */

/**
 * Supported image MIME types
 */
export enum ImageMimeType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
}

/**
 * File signature (magic bytes) definitions for image types
 */
const FILE_SIGNATURES = {
  // JPEG: FF D8 FF
  JPEG: [0xff, 0xd8, 0xff],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46],
  WEBP_WEBP: [0x57, 0x45, 0x42, 0x50],
};

/**
 * Check if buffer starts with the given signature
 */
function hasSignature(buffer: Buffer, signature: number[]): boolean {
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

/**
 * Validate file type using magic bytes (file signature)
 * 
 * @param buffer - File buffer to validate
 * @returns The detected MIME type or null if invalid
 */
export function validateImageType(buffer: Buffer): ImageMimeType | null {
  // Check JPEG signature
  if (hasSignature(buffer, FILE_SIGNATURES.JPEG)) {
    return ImageMimeType.JPEG;
  }

  // Check PNG signature
  if (hasSignature(buffer, FILE_SIGNATURES.PNG)) {
    return ImageMimeType.PNG;
  }

  // Check WebP signature (RIFF at start and WEBP at offset 8)
  if (
    hasSignature(buffer, FILE_SIGNATURES.WEBP_RIFF) &&
    buffer.length >= 12 &&
    hasSignature(buffer.slice(8, 12), FILE_SIGNATURES.WEBP_WEBP)
  ) {
    return ImageMimeType.WEBP;
  }

  return null;
}

/**
 * Validate file size
 * 
 * @param buffer - File buffer to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns true if file size is within limit
 */
export function validateFileSize(
  buffer: Buffer,
  maxSizeBytes: number,
): boolean {
  return buffer.length <= maxSizeBytes;
}

/**
 * Get human-readable file size
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Constants for file validation
 */
export const FILE_VALIDATION_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_IMAGES_PER_FIELD: 10,
  ALLOWED_MIME_TYPES: [
    ImageMimeType.JPEG,
    ImageMimeType.PNG,
    ImageMimeType.WEBP,
  ],
};
