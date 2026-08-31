import type { Locale } from '@/types';

export const locales = ['en', 'es'] as const;
export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'sr_locale';
export const LOCALE_HEADER = 'x-sr-locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Returns the locale from a pathname like `/en/news` or `null`. */
export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (isLocale(first)) return first;
  return null;
}

/** Strips the leading locale segment from a pathname. */
export function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (isLocale(segments[0])) {
    segments.shift();
  }
  return '/' + segments.join('/');
}

/** Builds a locale-prefixed path. Pass `pathname` without a locale prefix. */
export function localizedPath(locale: Locale, pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : '/' + pathname;
  if (clean === '/') return `/${locale}`;
  return `/${locale}${clean}`;
}
