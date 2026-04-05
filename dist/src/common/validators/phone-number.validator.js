"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsPhoneNumber = IsPhoneNumber;
exports.IsEgyptianPhoneNumber = IsEgyptianPhoneNumber;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
const class_validator_1 = require("class-validator");
const libphonenumber_js_1 = require("libphonenumber-js");
function IsPhoneNumber(defaultCountry, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isPhoneNumber',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [defaultCountry],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    if (typeof value !== 'string') {
                        return false;
                    }
                    try {
                        const country = args.constraints[0];
                        return (0, libphonenumber_js_1.isValidPhoneNumber)(value, country);
                    }
                    catch (error) {
                        return false;
                    }
                },
                defaultMessage(args) {
                    const country = args.constraints[0];
                    return country
                        ? `${args.property} must be a valid phone number for ${country}`
                        : `${args.property} must be a valid international phone number`;
                },
            },
        });
    };
}
function IsEgyptianPhoneNumber(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isEgyptianPhoneNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    if (typeof value !== 'string') {
                        return false;
                    }
                    try {
                        const phoneNumber = (0, libphonenumber_js_1.parsePhoneNumber)(value, 'EG');
                        return phoneNumber.isValid() && phoneNumber.country === 'EG';
                    }
                    catch (error) {
                        return false;
                    }
                },
                defaultMessage(args) {
                    return `${args.property} must be a valid Egyptian phone number`;
                },
            },
        });
    };
}
function sanitizePhoneNumber(phoneNumber, defaultCountry = 'EG') {
    try {
        const parsed = (0, libphonenumber_js_1.parsePhoneNumber)(phoneNumber, defaultCountry);
        return parsed.format('E.164');
    }
    catch (error) {
        return phoneNumber;
    }
}
//# sourceMappingURL=phone-number.validator.js.map