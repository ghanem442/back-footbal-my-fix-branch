import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nContext } from 'nestjs-i18n';

/**
 * Bilingual Response Interceptor
 * Wraps API responses in a standardized format with bilingual messages
 */
@Injectable()
export class BilingualResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const i18nContext = I18nContext.current(context);
    const currentLang = i18nContext?.lang || 'en';

    return next.handle().pipe(
      map((data) => {
        // If the response already has a standardized format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Wrap the response in a standardized format
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
