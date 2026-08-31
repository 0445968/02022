import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Builds a zodResolver that maps Zod error keys (e.g. 'invalidEmail')
 * to localized messages from the auth error dictionary.
 */
export function makeLocalizedResolver<T extends z.ZodTypeAny>(
  schema: T,
  errorDict: Dictionary['auth']['errors']
): Resolver<z.infer<T>> {
  const base = zodResolver(schema);
  return async (values, context, options) => {
    const result = await base(values, context, options);
    if (result.errors) {
      for (const key of Object.keys(result.errors)) {
        const err = (result.errors as Record<string, { message?: string }>)[key];
        if (err && typeof err.message === 'string' && err.message in errorDict) {
          err.message = errorDict[err.message as keyof typeof errorDict];
        }
      }
    }
    return result;
  };
}
