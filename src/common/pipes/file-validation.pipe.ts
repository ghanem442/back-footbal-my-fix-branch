import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import {
  validateImageType,
  validateFileSize,
  FILE_VALIDATION_CONSTANTS,
  formatFileSize,
} from '@common/utils/file-validation.util';

/**
 * File Upload Validation Pipe
 * 
 * Validates uploaded files for:
 * - File type using magic bytes (JPEG, PNG, WebP)
 * - File size (max 5MB)
 * 
 * Requirements: 24.1, 24.2, 24.3
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly errorMessage?: string) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        this.errorMessage || 'No file provided',
      );
    }

    // Validate file size
    if (
      !validateFileSize(file.buffer, FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES)
    ) {
      throw new BadRequestException(
        `File size exceeds ${formatFileSize(FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE_BYTES)} limit`,
      );
    }

    // Validate file type using magic bytes
    const detectedMimeType = validateImageType(file.buffer);
    if (!detectedMimeType) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      );
    }

    // Update the mimetype to the detected one (in case client sent wrong mimetype)
    file.mimetype = detectedMimeType;

    return file;
  }
}
