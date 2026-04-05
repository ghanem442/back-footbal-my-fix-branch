import { PipeTransform } from '@nestjs/common';
export declare class FileValidationPipe implements PipeTransform {
    private readonly errorMessage?;
    constructor(errorMessage?: string | undefined);
    transform(file: Express.Multer.File): Express.Multer.File;
}
