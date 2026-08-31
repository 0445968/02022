import Image from 'next/image';
import Link from 'next/link';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

interface MastheadProps {
  locale: Locale;
  compact?: boolean;
}

export function Masthead({
  locale,
  compact = false,
}: MastheadProps) {
  return (
    <Link
      href={localizedPath(
        locale,
        '/'
      )}
      className="
        inline-flex
        items-center
        transition-opacity
        hover:opacity-80
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
      "
      aria-label="Simply Raizal"
    >
      <Image
        src="/images/logo-10.png"
        alt="Simply Raizal"
        width={
          compact
            ? 150
            : 260
        }
        height={
          compact
            ? 40
            : 72
        }
        priority
        className={
          compact
  ? 'h-6 w-auto object-contain'
  : 'h-12 w-auto object-contain sm:h-14'
        }
      />
    </Link>
  );
}