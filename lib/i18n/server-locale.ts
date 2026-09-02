import 'server-only';

import {
  defaultLocale,
  isLocale,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

/**
 * Resolves the interface language for pages without
 * a locale segment in their URL.
 *
 * Cookie-based locale persistence is intentionally
 * deferred until production hardening.
 *
 * Current priority:
 *
 * 1. Signed-in reader's saved profile preference
 * 2. Application default
 */
export function getServerLocale(
  profileLocale?:
    | string
    | null
): Locale {
  if (
    isLocale(profileLocale)
  ) {
    return profileLocale;
  }

  return defaultLocale;
}