'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Link from 'next/link';
import { LogIn, LogOut, User, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-client';
import { localizedPath } from '@/lib/i18n/config';
import { isStaff } from '@/lib/permissions';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale, CurrentUser } from '@/types';

interface AccountButtonProps {
  user: CurrentUser | null;
  dict: Dictionary;
  locale: Locale;
}

export function AccountButton({ user, dict, locale }: AccountButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.push(localizedPath(locale, '/'));
      router.refresh();
    });
  }

  if (!user) {
    return (
      <Link
        href={localizedPath(locale, '/auth/sign-in')}
        className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{dict.nav.signIn}</span>
      </Link>
    );
  }

  const initials = (user.profile?.name ?? user.email ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-white px-2 text-xs font-semibold text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label={dict.nav.account}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deep text-[0.625rem] font-bold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[80px] truncate sm:inline">
          {user.profile?.name ?? user.email}
        </span>
      </button>

      <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 border border-border bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {dict.account.signedInAs}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {user.profile?.name ?? user.email}
          </p>
        </div>
        <ul className="py-1">
          {isStaff(user) && (
            <li>
              <Link
                href="/newsroom"
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted hover:text-primary focus-visible:bg-surface-muted focus-visible:outline-none"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                {dict.nav.newsroom}
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/account"
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted hover:text-primary focus-visible:bg-surface-muted focus-visible:outline-none"
            >
              <User className="h-4 w-4" aria-hidden />
              {dict.nav.account}
            </Link>
          </li>
          <li className="border-t border-border">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isPending}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-muted hover:text-breaking focus-visible:bg-surface-muted focus-visible:outline-none disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {dict.nav.signOut}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
