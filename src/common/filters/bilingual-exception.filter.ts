import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Bilingual Exception Filter
 * Catches all HTTP exceptions and formats them with bilingual error messages
 * Maps database errors to appropriate HTTP status codes
 * Never exposes sensitive data in errors
 * 
 * Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 */
@Catch()
export class BilingualExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BilingualExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const i18nContext = I18nContext.current(host);
    const currentLang = i18nContext?.lang || 'en';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | { en: string; ar: string } = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = undefined;

    // Handle Prisma database errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const dbError = this.handlePrismaError(exception);
      status = dbError.status;
      errorCode = dbError.code;
      message = await this.getBilingualMessage(dbError.translationKey, currentLang);
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'VALIDATION_ERROR';
      message = await this.getBilingualMessage('common.badRequest', currentLang);
    }
    // Handle rate limit errors
    else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      errorCode = 'TOO_MANY_REQUESTS';
      message = await this.getBilingualMessage('common.tooManyRequests', currentLang);
      
      // Add retry-after header
      response.setHeader('Retry-After', '900'); // 15 minutes
    }
    // Handle HTTP exceptions
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 🔍 DEBUG LOG: HTTP Exception
      console.log('=== HTTP EXCEPTION ===');
      console.log('Status:', status);
      console.log('Path:', request.url);
      console.log('Method:', request.method);
      console.log('Body:', JSON.stringify(request.body, null, 2));
      console.log('Exception Response:', JSON.stringify(exceptionResponse, null, 2));
      console.log('======================');

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          errorCode = 'VALIDATION_ERROR';
          
          // 🔍 DEBUG LOG: Validation errors
          console.log('=== VALIDATION ERROR ===');
          console.log('Path:', request.url);
          console.log('Method:', request.method);
          console.log('Body:', JSON.stringify(request.body, null, 2));
          console.log('Validation Errors:', JSON.stringify(responseObj.message, null, 2));
          console.log('========================');
          
          details = await this.translateValidationErrors(
            responseObj.message,
            currentLang,
          );
          message = await this.getBilingualMessage(
            'common.badRequest',
            currentLang,
          );
        } 
        // Handle structured error codes (from ErrorCodes constant)
        else if (responseObj.code && responseObj.message && typeof responseObj.message === 'object') {
          errorCode = responseObj.code;
          message = responseObj.message; // Already bilingual
          
          // Include additional error details
          const { code, message: msg, httpStatus, ...additionalDetails } = responseObj;
          if (Object.keys(additionalDetails).length > 0) {
            details = additionalDetails;
          }
        }
        else if (responseObj.message) {
          message = responseObj.message;
          errorCode = responseObj.error || this.getErrorCodeFromStatus(status);
        }
      } else {
        message = exceptionResponse as string;
        errorCode = this.getErrorCodeFromStatus(status);
      }
    }
    // Handle generic errors
    else if (exception instanceof Error) {
      // Log the full error for debugging but don't expose it
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        {
          path: request.url,
          method: request.method,
          userId: request.user?.userId,
        },
      );
      
      // Don't expose internal error details to client
      message = await this.getBilingualMessage('common.internalError', currentLang);
    }

    // If message is a string, try to get bilingual version
    if (typeof message === 'string') {
      message = await this.getBilingualMessage(
        this.getTranslationKey(errorCode),
        currentLang,
      );
    }

    // Sanitize error response to remove sensitive data
    const errorResponse = this.sanitizeErrorResponse({
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
    });

    // Log error for monitoring (but not sensitive data)
    if (status >= 500) {
      this.logger.error(
        `${status} ${errorCode} - ${request.method} ${request.url}`,
        {
          errorCode,
          status,
          userId: request.user?.userId,
        },
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Handle Prisma database errors and map to HTTP status codes
   * Requirements: 21.4
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    translationKey: string;
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          translationKey: 'common.duplicateEntry',
        };
      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          translationKey: 'common.notFound',
        };
      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          translationKey: 'common.invalidReference',
        };
      case 'P2014': // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'MISSING_RELATION',
          translationKey: 'common.missingRelation',
        };
      default:
        // Log unknown database error
        this.logger.error(`Unhandled Prisma error: ${error.code}`, error.message);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          translationKey: 'common.internalError',
        };
    }
  }

  /**
   * Sanitize error response to remove sensitive data
   * Never expose: passwords, tokens, internal paths, stack traces
   * Requirements: 21.7
   */
  private sanitizeErrorResponse(errorResponse: any): any {
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

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive keys
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          continue;
        }

        sanitized[key] = sanitize(value);
      }

      return sanitized;
    };

    return sanitize(errorResponse);
  }

  /**
   * Get bilingual message for a translation key
   */
  private async getBilingualMessage(
    key: string,
    currentLang: string,
  ): Promise<{ en: string; ar: string }> {
    try {
      const [en, ar] = await Promise.all([
        this.i18n.translate(key, { lang: 'en' }),
        this.i18n.translate(key, { lang: 'ar' }),
      ]);
      return { en: en as string, ar: ar as string };
    } catch {
      // Fallback to generic error message
      return {
        en: 'An error occurred',
        ar: 'حدث خطأ',
      };
    }
  }

  /**
   * Translate validation errors
   */
  private async translateValidationErrors(
    errors: any[],
    currentLang: string,
  ): Promise<any[]> {
    return Promise.all(
      errors.map(async (error) => {
        if (typeof error === 'string') {
          return {
            message: await this.getBilingualMessage(
              'validation.required',
              currentLang,
            ),
          };
        }

        const field = error.property || error.field;
        const constraints = error.constraints || {};
        const translatedMessages: { en: string; ar: string }[] = [];

        for (const [constraint, message] of Object.entries(constraints)) {
          const translationKey = `validation.${constraint}`;
          try {
            const translated = await this.getBilingualMessage(
              translationKey,
              currentLang,
            );
            translatedMessages.push(translated);
          } catch {
            // If no translation found, use the original message
            translatedMessages.push({
              en: message as string,
              ar: message as string,
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
      }),
    );
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_ERROR';
      default:
        return 'ERROR';
    }
  }

  /**
   * Get translation key from error code
   */
  private getTranslationKey(errorCode: string): string {
    const keyMap: Record<string, string> = {
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
}
