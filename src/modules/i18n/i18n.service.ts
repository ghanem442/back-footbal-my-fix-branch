import { Injectable } from '@nestjs/common';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';

/**
 * I18n Service Wrapper
 * Provides easy access to translation functionality throughout the application
 */
@Injectable()
export class I18nService {
  constructor(private readonly i18n: NestI18nService) {}

  /**
   * Translate a key with optional arguments
   * @param key Translation key (e.g., 'auth.loginSuccess')
   * @param args Optional arguments for interpolation
   * @param lang Optional language override
   */
  translate(
    key: string,
    args?: Record<string, any>,
    lang?: string,
  ): Promise<string> {
    return this.i18n.translate(key, {
      lang: lang || this.getCurrentLanguage(),
      args,
    });
  }

  /**
   * Translate a key synchronously (use with caution)
   * @param key Translation key
   * @param args Optional arguments for interpolation
   * @param lang Optional language override
   */
  translateSync(
    key: string,
    args?: Record<string, any>,
    lang?: string,
  ): string {
    const context = I18nContext.current();
    return this.i18n.t(key, {
      lang: lang || context?.lang || 'en',
      args,
    });
  }

  /**
   * Get the current language from context
   */
  getCurrentLanguage(): string {
    const context = I18nContext.current();
    return context?.lang || 'en';
  }

  /**
   * Get bilingual response (both English and Arabic)
   * @param key Translation key
   * @param args Optional arguments for interpolation
   */
  async getBilingualMessage(
    key: string,
    args?: Record<string, any>,
  ): Promise<{ en: string; ar: string }> {
    const [en, ar] = await Promise.all([
      this.i18n.translate(key, { lang: 'en', args }),
      this.i18n.translate(key, { lang: 'ar', args }),
    ]);

    return { en: en as string, ar: ar as string };
  }

  /**
   * Translate validation error messages
   * @param errors Array of validation errors
   * @param lang Optional language override
   */
  async translateValidationErrors(
    errors: Array<{ field: string; constraints: Record<string, string> }>,
    lang?: string,
  ): Promise<
    Array<{ field: string; messages: Record<string, string>; message: string }>
  > {
    const language = lang || this.getCurrentLanguage();

    return Promise.all(
      errors.map(async (error) => {
        const messages: Record<string, string> = {};
        const translatedMessages: string[] = [];

        for (const [constraint, message] of Object.entries(
          error.constraints,
        )) {
          // Try to find a translation key for the constraint
          const translationKey = `validation.${constraint}`;
          try {
            const translated = await this.i18n.translate(translationKey, {
              lang: language,
              args: { field: error.field },
            });
            messages[constraint] = translated as string;
            translatedMessages.push(translated as string);
          } catch {
            // If no translation found, use the original message
            messages[constraint] = message;
            translatedMessages.push(message);
          }
        }

        return {
          field: error.field,
          messages,
          message: translatedMessages[0], // Return first message as primary
        };
      }),
    );
  }
}
