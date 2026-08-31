import Image from 'next/image';
import Link from 'next/link';

import {
  ExternalLink,
} from 'lucide-react';

import {
  SignOutButton,
} from '@/components/editorial/sign-out-button';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  Locale,
} from '@/types';

interface NewsroomTopBarProps {
  dict: Dictionary;
  locale: Locale;
}

export function NewsroomTopBar({
  dict,
  locale,
}: NewsroomTopBarProps) {
  const siteHref =
    `/${locale}`;

  return (
    <header
      className="
        flex
        h-14
        items-center
        justify-between
        border-b
        border-border
        bg-white
        px-4
      "
    >
      <div className="flex items-center gap-3">
        <Link
          href={siteHref}
          className="
            inline-flex
            items-center
            transition-opacity
            hover:opacity-80
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
          aria-label="West Island Times"
        >
          <Image
            src="/images/logo-10.png"
            alt="West Island Times"
            width={140}
            height={36}
            priority
            className="
              h-6
              w-auto
              object-contain
            "
          />
        </Link>

        <span
          className="
            hidden
            border-l
            border-border
            pl-3
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-muted-foreground
            sm:inline
          "
        >
          {
            dict.newsroom
              .title
          }
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={siteHref}
          className="
            hidden
            items-center
            gap-1.5
            text-xs
            font-medium
            text-muted-foreground
            transition-colors
            hover:text-primary
            focus-visible:outline-none
            focus-visible:underline
            sm:inline-flex
          "
        >
          {
            dict.newsroom
              .backToSite
          }

          <ExternalLink
            className="h-3.5 w-3.5"
            aria-hidden
          />
        </Link>

        <SignOutButton
          dict={dict}
        />
      </div>
    </header>
  );
}