import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator for latitude coordinates
 * Validates that the value is between -90 and 90
 * 
 * Requirements: 21.1, 21.2
 */
export function IsLatitude(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isLatitude',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') {
            return false;
          }
          return value >= -90 && value <= 90;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid latitude between -90 and 90`;
        },
      },
    });
  };
}

/**
 * Custom validator for longitude coordinates
 * Validates that the value is between -180 and 180
 * 
 * Requirements: 21.1, 21.2
 */
export function IsLongitude(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isLongitude',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') {
            return false;
          }
          return value >= -180 && value <= 180;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid longitude between -180 and 180`;
        },
      },
    });
  };
}

/**
 * Custom validator for coordinate pairs
 * Validates both latitude and longitude in a single object
 * 
 * Requirements: 21.1, 21.2
 */
export function IsCoordinates(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCoordinates',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') {
            return false;
          }
          
          const { latitude, longitude } = value;
          
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return false;
          }
          
          const validLatitude = latitude >= -90 && latitude <= 90;
          const validLongitude = longitude >= -180 && longitude <= 180;
          
          return validLatitude && validLongitude;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain valid latitude (-90 to 90) and longitude (-180 to 180)`;
        },
      },
    });
  };
}
