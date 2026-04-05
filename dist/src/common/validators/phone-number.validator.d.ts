import { ValidationOptions } from 'class-validator';
export declare function IsPhoneNumber(defaultCountry?: string, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsEgyptianPhoneNumber(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function sanitizePhoneNumber(phoneNumber: string, defaultCountry?: string): string;
