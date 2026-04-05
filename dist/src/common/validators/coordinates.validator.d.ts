import { ValidationOptions } from 'class-validator';
export declare function IsLatitude(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsLongitude(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsCoordinates(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
