import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Custom validator for international phone numbers
 * Uses libphonenumber-js for validation
 * 
 * Requirements: 21.1, 21.2
 */
export function IsPhoneNumber(
  defaultCountry?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [defaultCountry],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          try {
            const country = args.constraints[0] as string | undefined;
            return isValidPhoneNumber(value, country as any);
          } catch (error) {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const country = args.constraints[0];
          return country
            ? `${args.property} must be a valid phone number for ${country}`
            : `${args.property} must be a valid international phone number`;
        },
      },
    });
  };
}

/**
 * Custom validator for Egyptian phone numbers
 * Validates Egyptian mobile numbers (starts with +20 or 0)
 * 
 * Requirements: 21.1, 21.2
 */
export function IsEgyptianPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEgyptianPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          try {
            const phoneNumber = parsePhoneNumber(value, 'EG');
            return phoneNumber.isValid() && phoneNumber.country === 'EG';
          } catch (error) {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Egyptian phone number`;
        },
      },
    });
  };
}

/**
 * Sanitize phone number to E.164 format
 * Converts phone number to international format
 */
export function sanitizePhoneNumber(
  phoneNumber: string,
  defaultCountry: string = 'EG',
): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any);
    return parsed.format('E.164');
  } catch (error) {
    return phoneNumber;
  }
}
