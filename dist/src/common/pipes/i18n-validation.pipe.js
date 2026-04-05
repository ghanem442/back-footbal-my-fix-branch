"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let I18nValidationPipe = class I18nValidationPipe {
    async transform(value, { metatype }) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }
        const object = (0, class_transformer_1.plainToInstance)(metatype, value);
        const errors = await (0, class_validator_1.validate)(object, {
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        });
        if (errors.length > 0) {
            const formattedErrors = this.formatErrors(errors);
            throw new common_1.BadRequestException(formattedErrors);
        }
        return object;
    }
    toValidate(metatype) {
        const types = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
    formatErrors(errors) {
        return errors.map((error) => {
            const constraints = {};
            if (error.constraints) {
                for (const [key, value] of Object.entries(error.constraints)) {
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
    mapConstraintToTranslationKey(constraint) {
        const mapping = {
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
};
exports.I18nValidationPipe = I18nValidationPipe;
exports.I18nValidationPipe = I18nValidationPipe = __decorate([
    (0, common_1.Injectable)()
], I18nValidationPipe);
//# sourceMappingURL=i18n-validation.pipe.js.map