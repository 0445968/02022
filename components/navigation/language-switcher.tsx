'use client';

import { Globe } from 'lucide-react';
import { useSyncExternalStore } from 'react';
const subscribe=()=>()=>{};
const clientReady=()=>true;
const serverReady=()=>false;
import type { Locale } from '@/types';
import { localizedPath, stripLocale } from '@/lib/i18n/config';

interface LanguageSwitcherProps {
  locale: Locale;
  label: string;
}

/**
 * Toggles between English and Spanish. Persists the choice via the
 * `sr_locale` cookie (set by middleware on every locale-prefixed request)
 * and navigates to the same page under the new locale.
 */
export function LanguageSwitcher({ locale, label }: LanguageSwitcherProps) {
  const ready=useSyncExternalStore(subscribe,clientReady,serverReady);
  const target: Locale = locale === 'en' ? 'es' : 'en';

  function switchLocale() {
    const current = new URL(window.location.href);
    const rest = stripLocale(current.pathname);
    const next = localizedPath(target, rest) + current.search + current.hash;
    // A locale change is a document navigation. This avoids carrying the
    // App Router's previous fragment into the target and refreshes the
    // server language, metadata, and locale cookie together.
    window.location.assign(next);
  }

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={switchLocale}
      className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-white px-2.5 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      aria-label={label}
      title={label}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden />
      <span>{target === 'en' ? 'EN' : 'ES'}</span>
    </button>
  );
}
