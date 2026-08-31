'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { getMobileNav } from '@/lib/navigation/nav-config';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale, CurrentUser } from '@/types';
import { localizedPath } from '@/lib/i18n/config';
import { AccountButton } from '@/components/navigation/account-button';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser | null;
}

export function MobileNav({ open, onClose, dict, locale, user }: MobileNavProps) {
  const items = getMobileNav(dict, locale);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={dict.nav.menu}>
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-deep/60"
        onClick={onClose}
        aria-label={dict.nav.close}
        tabIndex={-1}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-white shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-headline text-lg font-semibold text-deep">
            Simply<span className="text-primary">Raizal</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={dict.nav.close}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Mobile primary">
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block border-b border-border/60 px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-muted hover:text-primary focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-4">
          <LanguageSwitcher locale={locale} label={dict.utility.language} />
          <AccountButton user={user} dict={dict} locale={locale} />
        </div>
      </div>
    </div>
  );
}
