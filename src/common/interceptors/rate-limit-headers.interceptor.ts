import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Interceptor to add rate limit headers to responses
 * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * 
 * Requirements: 20.3, 20.4
 */
@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        // Add rate limit headers if available from throttler
        if (request.rateLimit) {
          response.setHeader('X-RateLimit-Limit', request.rateLimit.limit);
          response.setHeader('X-RateLimit-Remaining', request.rateLimit.remaining);
          response.setHeader('X-RateLimit-Reset', request.rateLimit.reset);
        }
      }),
    );
  }
}
