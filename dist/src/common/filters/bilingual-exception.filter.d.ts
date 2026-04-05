import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
export declare class BilingualExceptionFilter implements ExceptionFilter {
    private readonly i18n;
    private readonly logger;
    constructor(i18n: I18nService);
    catch(exception: unknown, host: ArgumentsHost): Promise<void>;
    private handlePrismaError;
    private sanitizeErrorResponse;
    private getBilingualMessage;
    private translateValidationErrors;
    private getErrorCodeFromStatus;
    private getTranslationKey;
}
