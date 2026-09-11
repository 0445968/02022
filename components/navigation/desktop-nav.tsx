import {
  ChevronDown,
} from 'lucide-react';

import Link from 'next/link';

import {
  getPrimaryNav,
  type NavItem,
} from '@/lib/navigation/nav-config';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  Locale,
} from '@/types';

interface DesktopNavProps {
  dict: Dictionary;
  locale: Locale;
  inline?: boolean;
}

const PRIMARY_KEYS = [
  'sanAndres',
  'oldProvidence',
  'sports',
  'politics',
  'opinion',
  'colombia',
  'caribbean',
  'world',
];

const MORE_KEYS = [
  'environment',
  'business',
  'health',
  'culture',
  'religion',
  'music',
  'community',
  'education',
  'entertainment',
  'travel',
  'tourism',
  'wellness',
  'events',
  'watch',
  'listen',
  'vault',
];

function getPrimaryVisibilityClass(
  key: string
) {
  switch (key) {
    case 'world':
      return 'hidden 2xl:inline-flex';

    case 'caribbean':
      return 'hidden min-[1450px]:inline-flex';

    case 'colombia':
      return 'hidden min-[1360px]:inline-flex';

    case 'opinion':
      return 'hidden min-[1280px]:inline-flex';

    case 'politics':
      return 'hidden min-[1200px]:inline-flex';

    case 'sports':
      return 'hidden min-[1120px]:inline-flex';

    default:
      return 'inline-flex';
  }
}

function shouldAppearInMore(
  key: string
) {
  return PRIMARY_KEYS.includes(
    key
  );
}

function getMoreVisibilityClass(
  key: string
) {
  switch (key) {
    case 'world':
      return '2xl:hidden';

    case 'caribbean':
      return 'min-[1450px]:hidden';

    case 'colombia':
      return 'min-[1360px]:hidden';

    case 'opinion':
      return 'min-[1280px]:hidden';

    case 'politics':
      return 'min-[1200px]:hidden';

    case 'sports':
      return 'min-[1120px]:hidden';

    case 'sanAndres':
    case 'oldProvidence':
      return 'hidden';

    default:
      return '';
  }
}

export function DesktopNav({
  dict,
  locale,
  inline = false,
}: DesktopNavProps) {
  const all =
    getPrimaryNav(
      dict,
      locale
    );

  const primary =
    all.filter(
      (item) =>
        PRIMARY_KEYS.includes(
          item.key
        )
    );

  const standardMore =
    all.filter(
      (item) =>
        MORE_KEYS.includes(
          item.key
        )
    );

  const responsiveMore =
    primary.filter(
      (item) =>
        shouldAppearInMore(
          item.key
        )
    );

  const content = (
    <div
      className="
        flex
        h-full
        min-w-0
        items-center
      "
    >
      {primary.map(
        (item) => (
          <NavLink
            key={
              item.key
            }
            item={item}
            className={getPrimaryVisibilityClass(
              item.key
            )}
          />
        )
      )}

      <div
        className="
          group
          relative
          flex
          h-full
          shrink-0
          items-center
        "
      >
        <button
          type="button"
          className="
            inline-flex
            h-full
            items-center
            gap-1
            whitespace-nowrap
            px-2.5
            text-[14px]
            font-semibold
            text-foreground
            transition-colors
            hover:text-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
          aria-haspopup="true"
        >
          {dict.nav.more}

          <ChevronDown
            className="
              h-3.5
              w-3.5
              transition-transform
              group-hover:rotate-180
            "
            aria-hidden
          />
        </button>

        <div
          className="
            invisible
            absolute
            right-0
            top-full
            z-50
            w-72
            border
            border-border
            bg-white
            opacity-0
            shadow-lg
            transition-all
            group-hover:visible
            group-hover:opacity-100
            group-focus-within:visible
            group-focus-within:opacity-100
          "
        >
          <ul
            className="
              grid
              grid-cols-2
              py-1
            "
          >
            {responsiveMore.map(
              (item) => (
                <li
                  key={
                    `responsive-${item.key}`
                  }
                  className={getMoreVisibilityClass(
                    item.key
                  )}
                >
                  <Link
                    href={
                      item.href
                    }
                    className="
                      block
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      text-foreground
                      transition-colors
                      hover:bg-surface-muted
                      hover:text-primary
                      focus-visible:bg-surface-muted
                      focus-visible:outline-none
                    "
                  >
                    {
                      item.label
                    }
                  </Link>
                </li>
              )
            )}

            {standardMore.map(
              (item) => (
                <li
                  key={
                    item.key
                  }
                >
                  <Link
                    href={
                      item.href
                    }
                    className="
                      block
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      text-foreground
                      transition-colors
                      hover:bg-surface-muted
                      hover:text-primary
                      focus-visible:bg-surface-muted
                      focus-visible:outline-none
                    "
                  >
                    {
                      item.label
                    }
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <nav
        className="
          hidden
          h-full
          min-w-0
          lg:block
        "
        aria-label="Primary"
      >
        {content}
      </nav>
    );
  }

  return (
    <nav
      className="
        hidden
        border-b
        border-border
        bg-white
        lg:block
      "
      aria-label="Primary"
    >
      <div
        className="
          container-wide
          h-11
        "
      >
        {content}
      </div>
    </nav>
  );
}

function NavLink({
  item,
  className = '',
}: {
  item: NavItem;
  className?: string;
}) {
  return (
    <Link
      href={
        item.href
      }
      className={`
        h-full
        items-center
        whitespace-nowrap
        px-2.5
        text-[14px]
        font-semibold
        text-foreground
        transition-colors
        hover:text-primary
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        ${className}
      `}
    >
      {item.label}
    </Link>
  );
}