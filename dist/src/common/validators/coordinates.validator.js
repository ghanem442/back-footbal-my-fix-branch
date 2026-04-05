"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsLatitude = IsLatitude;
exports.IsLongitude = IsLongitude;
exports.IsCoordinates = IsCoordinates;
const class_validator_1 = require("class-validator");
function IsLatitude(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isLatitude',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    if (typeof value !== 'number') {
                        return false;
                    }
                    return value >= -90 && value <= 90;
                },
                defaultMessage(args) {
                    return `${args.property} must be a valid latitude between -90 and 90`;
                },
            },
        });
    };
}
function IsLongitude(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isLongitude',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    if (typeof value !== 'number') {
                        return false;
                    }
                    return value >= -180 && value <= 180;
                },
                defaultMessage(args) {
                    return `${args.property} must be a valid longitude between -180 and 180`;
                },
            },
        });
    };
}
function IsCoordinates(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isCoordinates',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
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
                defaultMessage(args) {
                    return `${args.property} must contain valid latitude (-90 to 90) and longitude (-180 to 180)`;
                },
            },
        });
    };
}
//# sourceMappingURL=coordinates.validator.js.map