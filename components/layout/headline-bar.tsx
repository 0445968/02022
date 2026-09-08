import Link from 'next/link';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface HeadlineBarProps {
  locale: Locale;

  placements:
    HomepagePlacement[];
}

export function HeadlineBar({
  locale,
  placements,
}: HeadlineBarProps) {
  const stories =
    placements
      .filter(
        (placement) =>
          placement.active &&
          placement.slot ===
            'headline_bar'
      )
      .sort(
        (
          a,
          b
        ) =>
          a.position -
          b.position
      );

  if (
    stories.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      className="
        sticky
        top-14
        z-30
        bg-white
        shadow-[0_8px_18px_rgba(15,23,42,0.08)]
        lg:top-[64px]
      "
    >
      <div
        className="
          container-wide
          overflow-hidden
        "
      >
        <div
          className="
            flex
            min-h-[42px]
            items-center
            justify-center
            overflow-x-auto
            whitespace-nowrap
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {stories.map(
            (
              placement,
              index
            ) => {
              const story =
                placement.story;

              const label =
                story.shortTitle
                  ?.trim() ||
                story.headline;

              return (
                <div
                  key={
                    placement.id
                  }
                  className="
                    flex
                    shrink-0
                    items-center
                  "
                >
                  {index >
                    0 && (
                    <span
                      className="
                        mx-4
                        h-4
                        w-px
                        bg-border
                      "
                      aria-hidden
                    />
                  )}

                  <Link
                    href={localizedPath(
                      locale,
                      `/article/${story.slug}`
                    )}
                    className="
                      text-[13px]
                      font-medium
                      leading-none
                      text-foreground
                      transition-colors
                      hover:text-primary
                      focus-visible:outline-none
                      focus-visible:text-primary
                      focus-visible:underline
                    "
                  >
                    {label}
                  </Link>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}