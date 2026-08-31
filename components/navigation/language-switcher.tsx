'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
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
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const target: Locale = locale === 'en' ? 'es' : 'en';

  function switchLocale() {
    const rest = stripLocale(pathname);
    const next = localizedPath(target, rest);
    startTransition(() => {
      router.push(next);
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-white px-2.5 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      aria-label={label}
      title={label}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden />
      <span>{target === 'en' ? 'EN' : 'ES'}</span>
    </button>
  );
}
