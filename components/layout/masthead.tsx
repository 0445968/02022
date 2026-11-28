import {BRAND_NAME,BRAND_LOGO,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from '@/lib/brand';
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
        max-w-full
        items-center
        transition-opacity
        hover:opacity-80
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
      "
      aria-label={BRAND_NAME}
    >
      <Image
        src={BRAND_LOGO} unoptimized
        alt={BRAND_NAME}
        width={BRAND_LOGO_WIDTH} height={BRAND_LOGO_HEIGHT}
        priority
        className={
          compact
  ? 'h-auto max-h-6 w-auto max-w-full object-contain'
  : 'h-12 w-auto object-contain sm:h-14'
        }
      />
    </Link>
  );
}