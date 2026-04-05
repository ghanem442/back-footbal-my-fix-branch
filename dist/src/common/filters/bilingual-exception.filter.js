"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BilingualExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BilingualExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const nestjs_i18n_1 = require("nestjs-i18n");
const client_1 = require("@prisma/client");
const throttler_1 = require("@nestjs/throttler");
let BilingualExceptionFilter = BilingualExceptionFilter_1 = class BilingualExceptionFilter {
    constructor(i18n) {
        this.i18n = i18n;
        this.logger = new common_1.Logger(BilingualExceptionFilter_1.name);
    }
    async catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const i18nContext = nestjs_i18n_1.I18nContext.current(host);
        const currentLang = i18nContext?.lang || 'en';
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errorCode = 'INTERNAL_ERROR';
        let details = undefined;
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            const dbError = this.handlePrismaError(exception);
            status = dbError.status;
            errorCode = dbError.code;
            message = await this.getBilingualMessage(dbError.translationKey, currentLang);
        }
        else if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            errorCode = 'VALIDATION_ERROR';
            message = await this.getBilingualMessage('common.badRequest', currentLang);
        }
        else if (exception instanceof throttler_1.ThrottlerException) {
            status = common_1.HttpStatus.TOO_MANY_REQUESTS;
            errorCode = 'TOO_MANY_REQUESTS';
            message = await this.getBilingualMessage('common.tooManyRequests', currentLang);
            response.setHeader('Retry-After', '900');
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            console.log('=== HTTP EXCEPTION ===');
            console.log('Status:', status);
            console.log('Path:', request.url);
            console.log('Method:', request.method);
            console.log('Body:', JSON.stringify(request.body, null, 2));
            console.log('Exception Response:', JSON.stringify(exceptionResponse, null, 2));
            console.log('======================');
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse;
                if (Array.isArray(responseObj.message)) {
                    errorCode = 'VALIDATION_ERROR';
                    console.log('=== VALIDATION ERROR ===');
                    console.log('Path:', request.url);
                    console.log('Method:', request.method);
                    console.log('Body:', JSON.stringify(request.body, null, 2));
                    console.log('Validation Errors:', JSON.stringify(responseObj.message, null, 2));
                    console.log('========================');
                    details = await this.translateValidationErrors(responseObj.message, currentLang);
                    message = await this.getBilingualMessage('common.badRequest', currentLang);
                }
                else if (responseObj.code && responseObj.message && typeof responseObj.message === 'object') {
                    errorCode = responseObj.code;
                    message = responseObj.message;
                    const { code, message: msg, httpStatus, ...additionalDetails } = responseObj;
                    if (Object.keys(additionalDetails).length > 0) {
                        details = additionalDetails;
                    }
                }
                else if (responseObj.message) {
                    message = responseObj.message;
                    errorCode = responseObj.error || this.getErrorCodeFromStatus(status);
                }
            }
            else {
                message = exceptionResponse;
                errorCode = this.getErrorCodeFromStatus(status);
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(`Unhandled error: ${exception.message}`, exception.stack, {
                path: request.url,
                method: request.method,
                userId: request.user?.userId,
            });
            message = await this.getBilingualMessage('common.internalError', currentLang);
        }
        if (typeof message === 'string') {
            message = await this.getBilingualMessage(this.getTranslationKey(errorCode), currentLang);
        }
        const errorResponse = this.sanitizeErrorResponse({
            success: false,
            error: {
                code: errorCode,
                message,
                ...(details && { details }),
            },
            timestamp: new Date().toISOString(),
        });
        if (status >= 500) {
            this.logger.error(`${status} ${errorCode} - ${request.method} ${request.url}`, {
                errorCode,
                status,
                userId: request.user?.userId,
            });
        }
        response.status(status).json(errorResponse);
    }
    handlePrismaError(error) {
        switch (error.code) {
            case 'P2002':
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    code: 'DUPLICATE_ENTRY',
                    translationKey: 'common.duplicateEntry',
                };
            case 'P2025':
                return {
                    status: common_1.HttpStatus.NOT_FOUND,
                    code: 'NOT_FOUND',
                    translationKey: 'common.notFound',
                };
            case 'P2003':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    code: 'INVALID_REFERENCE',
                    translationKey: 'common.invalidReference',
                };
            case 'P2014':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    code: 'MISSING_RELATION',
                    translationKey: 'common.missingRelation',
                };
            default:
                this.logger.error(`Unhandled Prisma error: ${error.code}`, error.message);
                return {
                    status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    code: 'DATABASE_ERROR',
                    translationKey: 'common.internalError',
                };
        }
    }
    sanitizeErrorResponse(errorResponse) {
        const sensitiveKeys = [
            'password',
            'passwordHash',
            'token',
            'accessToken',
            'refreshToken',
            'secret',
            'apiKey',
            'stack',
            'trace',
        ];
        const sanitize = (obj) => {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(sanitize);
            }
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    continue;
                }
                sanitized[key] = sanitize(value);
            }
            return sanitized;
        };
        return sanitize(errorResponse);
    }
    async getBilingualMessage(key, currentLang) {
        try {
            const [en, ar] = await Promise.all([
                this.i18n.translate(key, { lang: 'en' }),
                this.i18n.translate(key, { lang: 'ar' }),
            ]);
            return { en: en, ar: ar };
        }
        catch {
            return {
                en: 'An error occurred',
                ar: 'حدث خطأ',
            };
        }
    }
    async translateValidationErrors(errors, currentLang) {
        return Promise.all(errors.map(async (error) => {
            if (typeof error === 'string') {
                return {
                    message: await this.getBilingualMessage('validation.required', currentLang),
                };
            }
            const field = error.property || error.field;
            const constraints = error.constraints || {};
            const translatedMessages = [];
            for (const [constraint, message] of Object.entries(constraints)) {
                const translationKey = `validation.${constraint}`;
                try {
                    const translated = await this.getBilingualMessage(translationKey, currentLang);
                    translatedMessages.push(translated);
                }
                catch {
                    translatedMessages.push({
                        en: message,
                        ar: message,
                    });
                }
            }
            return {
                field,
                message: translatedMessages[0] || {
                    en: 'Validation failed',
                    ar: 'فشل التحقق',
                },
            };
        }));
    }
    getErrorCodeFromStatus(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            case common_1.HttpStatus.TOO_MANY_REQUESTS:
                return 'TOO_MANY_REQUESTS';
            case common_1.HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_ERROR';
            default:
                return 'ERROR';
        }
    }
    getTranslationKey(errorCode) {
        const keyMap = {
            BAD_REQUEST: 'common.badRequest',
            UNAUTHORIZED: 'common.unauthorized',
            FORBIDDEN: 'common.forbidden',
            NOT_FOUND: 'common.notFound',
            INTERNAL_ERROR: 'common.internalError',
            VALIDATION_ERROR: 'common.badRequest',
            TOO_MANY_REQUESTS: 'common.tooManyRequests',
            DUPLICATE_ENTRY: 'common.duplicateEntry',
            INVALID_REFERENCE: 'common.invalidReference',
            MISSING_RELATION: 'common.missingRelation',
        };
        return keyMap[errorCode] || 'common.error';
    }
};
exports.BilingualExceptionFilter = BilingualExceptionFilter;
exports.BilingualExceptionFilter = BilingualExceptionFilter = BilingualExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [nestjs_i18n_1.I18nService])
], BilingualExceptionFilter);
//# sourceMappingURL=bilingual-exception.filter.js.map