"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BilingualResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const nestjs_i18n_1 = require("nestjs-i18n");
let BilingualResponseInterceptor = class BilingualResponseInterceptor {
    intercept(context, next) {
        const i18nContext = nestjs_i18n_1.I18nContext.current(context);
        const currentLang = i18nContext?.lang || 'en';
        return next.handle().pipe((0, operators_1.map)((data) => {
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }
            return {
                success: true,
                data,
                timestamp: new Date().toISOString(),
            };
        }));
    }
};
exports.BilingualResponseInterceptor = BilingualResponseInterceptor;
exports.BilingualResponseInterceptor = BilingualResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], BilingualResponseInterceptor);
//# sourceMappingURL=bilingual-response.interceptor.js.map