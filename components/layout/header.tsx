'use client';

import {
  Menu,
} from 'lucide-react';

import {
  useState,
} from 'react';

import {
  AccountButton,
} from '@/components/navigation/account-button';

import {
  DesktopNav,
} from '@/components/navigation/desktop-nav';

import {
  LanguageSwitcher,
} from '@/components/navigation/language-switcher';

import {
  MobileNav,
} from '@/components/navigation/mobile-nav';

import {
  Masthead,
} from '@/components/layout/masthead';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  CurrentUser,
  Locale,
} from '@/types';

interface HeaderProps {
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser | null;
}

export function Header({
  dict,
  locale,
  user,
}: HeaderProps) {
  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-border
          bg-white/95
          backdrop-blur
          supports-[backdrop-filter]:bg-white/90
        "
      >
        <div
          className="
            container-wide
            flex
            h-14
            items-center
            gap-3
            lg:h-[58px]
          "
        >
          {/* Menu */}
          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                true
              )
            }
            className="
              inline-flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              text-foreground
              transition-colors
              hover:bg-surface-muted
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            aria-label={
              dict.nav.menu
            }
          >
            <Menu
              className="h-5 w-5"
              aria-hidden
            />
          </button>

          {/* Logo */}
          <div className="shrink-0">
            <Masthead
              locale={locale}
              compact
            />
          </div>

          {/* Desktop navigation */}
          <div
            className="
              hidden
              min-w-0
              flex-1
              items-center
              overflow-visible
              lg:flex
            "
          >
            <DesktopNav
              dict={dict}
              locale={locale}
              inline
            />
          </div>

          {/* Right controls */}
          <div
            className="
              ml-auto
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            <LanguageSwitcher
              locale={locale}
              label={
                dict.utility
                  .language
              }
            />

            <AccountButton
              user={user}
              dict={dict}
              locale={locale}
            />
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(
            false
          )
        }
        dict={dict}
        locale={locale}
        user={user}
      />
    </>
  );
}