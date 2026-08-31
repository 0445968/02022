import { defaultLocale } from '@/lib/i18n/config';
import type { Locale } from '@/types';

/**
 * Lightweight server-side dictionary loader.
 * In Stage 1 we import messages statically. Later stages can swap this
 * for a lazy loader without changing the call sites.
 */
import en from '@/messages/en.json';
import es from '@/messages/es.json';

const dictionaries = { en, es } as const;

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return (dictionaries[locale] ?? dictionaries[defaultLocale]) as Dictionary;
}

/** A typed accessor for a nested key, e.g. t('nav.latest'). */
export type DictionaryKey = Paths<Dictionary>;

type Paths<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? Paths<T[K], `${P}${K}.`>
        : `${P}${K}`;
    }[keyof T & string]
  : never;

export function t(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}
