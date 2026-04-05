import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class I18nValidationPipe implements PipeTransform<any> {
    transform(value: any, { metatype }: ArgumentMetadata): Promise<any>;
    private toValidate;
    private formatErrors;
    private mapConstraintToTranslationKey;
}
