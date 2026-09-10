'use client';

import {
  Headphones,
  Menu,
  Search,
} from 'lucide-react';

import Link from 'next/link';

import {
  useState,
} from 'react';

import {
  Masthead,
} from '@/components/layout/masthead';

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
  SearchMegaMenu,
} from '@/components/navigation/search-mega-menu';

import {
  localizedPath,
} from '@/lib/i18n/config';

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

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  function toggleSearch() {
    setSearchOpen(
      (current) =>
        !current
    );
  }

  function openMobileMenu() {
    setSearchOpen(
      false
    );

    setMobileOpen(
      true
    );
  }

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
            relative
            flex
            h-14
            items-center
            gap-3
            lg:h-[64px]
            lg:justify-between
          "
        >
          {/* Mobile menu */}
          <button
            type="button"
            onClick={
              openMobileMenu
            }
            className="
              inline-flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-foreground
              transition-colors
              hover:bg-surface-muted
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              lg:hidden
            "
            aria-label={
              dict.nav.menu
            }
          >
            <Menu
              className="
                h-5
                w-5
              "
              aria-hidden
            />
          </button>

          {/* Logo */}
          <div
            className="
              shrink-0
            "
          >
            <Masthead
              locale={
                locale
              }
              compact
            />
          </div>

          {/* Centered desktop navigation */}
          <div
            className="
              absolute
              left-1/2
              hidden
              h-full
              -translate-x-1/2
              items-center
              lg:flex
            "
          >
            <DesktopNav
              dict={
                dict
              }
              locale={
                locale
              }
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
              gap-1
              lg:ml-0
              lg:justify-self-end
              lg:gap-2
            "
          >
            {/* Search */}
            <button
              type="button"
              onClick={
                toggleSearch
              }
              className="
                inline-flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-foreground
                transition-colors
                hover:bg-surface-muted
                hover:text-primary
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
              aria-label={
                locale === 'es'
                  ? 'Buscar'
                  : 'Search'
              }
              aria-expanded={
                searchOpen
              }
              aria-haspopup="dialog"
            >
              <Search
                className="
                  h-[18px]
                  w-[18px]
                "
                aria-hidden
              />
            </button>

            {/* Listen */}
            <Link
              href={localizedPath(
                locale,
                '/listen'
              )}
              onClick={() =>
                setSearchOpen(
                  false
                )
              }
              className="
                hidden
                h-9
                items-center
                gap-1.5
                rounded-lg
                px-2.5
                text-sm
                font-semibold
                text-foreground
                transition-colors
                hover:bg-surface-muted
                hover:text-primary
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                sm:inline-flex
              "
            >
              <Headphones
                className="
                  h-[17px]
                  w-[17px]
                "
                aria-hidden
              />

              <span>
                {locale === 'es'
                  ? 'Escuchar'
                  : 'Listen'}
              </span>
            </Link>

            <LanguageSwitcher
              locale={
                locale
              }
              label={
                dict.utility
                  .language
              }
            />

            <AccountButton
              user={
                user
              }
              dict={
                dict
              }
              locale={
                locale
              }
            />
          </div>
        </div>

        {/* Search mega menu */}
        <SearchMegaMenu
          open={
            searchOpen
          }
          locale={
            locale
          }
          onClose={() =>
            setSearchOpen(
              false
            )
          }
        />
      </header>

      <MobileNav
        open={
          mobileOpen
        }
        onClose={() =>
          setMobileOpen(
            false
          )
        }
        dict={
          dict
        }
        locale={
          locale
        }
        user={
          user
        }
      />
    </>
  );
}