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
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_i18n_1 = require("nestjs-i18n");
let I18nService = class I18nService {
    constructor(i18n) {
        this.i18n = i18n;
    }
    translate(key, args, lang) {
        return this.i18n.translate(key, {
            lang: lang || this.getCurrentLanguage(),
            args,
        });
    }
    translateSync(key, args, lang) {
        const context = nestjs_i18n_1.I18nContext.current();
        return this.i18n.t(key, {
            lang: lang || context?.lang || 'en',
            args,
        });
    }
    getCurrentLanguage() {
        const context = nestjs_i18n_1.I18nContext.current();
        return context?.lang || 'en';
    }
    async getBilingualMessage(key, args) {
        const [en, ar] = await Promise.all([
            this.i18n.translate(key, { lang: 'en', args }),
            this.i18n.translate(key, { lang: 'ar', args }),
        ]);
        return { en: en, ar: ar };
    }
    async translateValidationErrors(errors, lang) {
        const language = lang || this.getCurrentLanguage();
        return Promise.all(errors.map(async (error) => {
            const messages = {};
            const translatedMessages = [];
            for (const [constraint, message] of Object.entries(error.constraints)) {
                const translationKey = `validation.${constraint}`;
                try {
                    const translated = await this.i18n.translate(translationKey, {
                        lang: language,
                        args: { field: error.field },
                    });
                    messages[constraint] = translated;
                    translatedMessages.push(translated);
                }
                catch {
                    messages[constraint] = message;
                    translatedMessages.push(message);
                }
            }
            return {
                field: error.field,
                messages,
                message: translatedMessages[0],
            };
        }));
    }
};
exports.I18nService = I18nService;
exports.I18nService = I18nService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nestjs_i18n_1.I18nService])
], I18nService);
//# sourceMappingURL=i18n.service.js.map