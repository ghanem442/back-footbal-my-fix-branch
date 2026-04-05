import { I18nService as NestI18nService } from 'nestjs-i18n';
export declare class I18nService {
    private readonly i18n;
    constructor(i18n: NestI18nService);
    translate(key: string, args?: Record<string, any>, lang?: string): Promise<string>;
    translateSync(key: string, args?: Record<string, any>, lang?: string): string;
    getCurrentLanguage(): string;
    getBilingualMessage(key: string, args?: Record<string, any>): Promise<{
        en: string;
        ar: string;
    }>;
    translateValidationErrors(errors: Array<{
        field: string;
        constraints: Record<string, string>;
    }>, lang?: string): Promise<Array<{
        field: string;
        messages: Record<string, string>;
        message: string;
    }>>;
}
