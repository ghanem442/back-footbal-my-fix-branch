import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * I18n Validation Pipe
 * Validates request DTOs and formats validation errors for i18n translation
 */
@Injectable()
export class I18nValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException(formattedErrors);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => {
      const constraints: Record<string, string> = {};

      if (error.constraints) {
        for (const [key, value] of Object.entries(error.constraints)) {
          // Map class-validator constraint names to our translation keys
          constraints[this.mapConstraintToTranslationKey(key)] = value;
        }
      }

      return {
        property: error.property,
        constraints,
        children: error.children?.length
          ? this.formatErrors(error.children)
          : undefined,
      };
    });
  }

  /**
   * Map class-validator constraint names to translation keys
   */
  private mapConstraintToTranslationKey(constraint: string): string {
    const mapping: Record<string, string> = {
      isNotEmpty: 'required',
      isString: 'isString',
      isNumber: 'isNumber',
      isBoolean: 'isBoolean',
      isEmail: 'isEmail',
      isEnum: 'isEnum',
      minLength: 'minLength',
      maxLength: 'maxLength',
      min: 'min',
      max: 'max',
      isLatitude: 'isLatitude',
      isLongitude: 'isLongitude',
    };

    return mapping[constraint] || constraint;
  }
}
