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
  'latest',
  'news',
  'sanAndres',
  'oldProvidence',
  'saintCatalina',
  'raizal',
];

const MORE_KEYS = [
  'environment',
  'politics',
  'business',
  'sports',
  'health',
  'culture',
  'religion',
  'music',
  'world',
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

  const more =
    all.filter(
      (item) =>
        MORE_KEYS.includes(
          item.key
        )
    );

  const content = (
    <div
      className="
        flex
        h-full
        items-center
        gap-0
      "
    >
      {primary.map(
        (item) => (
          <NavLink
            key={
              item.key
            }
            item={item}
          />
        )
      )}

      <div
        className="
          group
          relative
          flex
          h-full
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
          aria-expanded="false"
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
            left-0
            top-full
            z-50
            w-64
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
            "
          >
            {more.map(
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
}: {
  item: NavItem;
}) {
  return (
    <Link
      href={
        item.href
      }
      className="
        inline-flex
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
      "
    >
      {item.label}
    </Link>
  );
}
