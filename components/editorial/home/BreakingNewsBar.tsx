import Link from 'next/link';

import {
  ExternalLink,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  BreakingNewsItem,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface BreakingNewsBarProps {
  locale: Locale;
  items: BreakingNewsItem[];
}

function getHref(
  item: BreakingNewsItem,
  locale: Locale
) {
  if (
    item.story
  ) {
    return localizedPath(
      locale,
      `/article/${item.story.slug}`
    );
  }

  return (
    item.externalUrl ??
    null
  );
}

export function BreakingNewsBar({
  locale,
  items,
}: BreakingNewsBarProps) {
  const activeItems =
    [...items]
      .filter(
        (item) =>
          item.active
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  if (
    activeItems.length ===
    0
  ) {
    return null;
  }

  return (
    <section
      className="
        border-b
        border-breaking
        bg-breaking
        text-white
      "
    >
      <div
        className="
          container-wide
          flex
          min-h-[44px]
          items-stretch
        "
      >
        <div
          className="
            flex
            shrink-0
            items-center
            border-r
            border-white/20
            pr-4
          "
        >
          <span
            className="
              text-[11px]
              font-black
              uppercase
              tracking-[0.16em]
            "
          >
            {locale === 'es'
              ? 'Última hora'
              : 'Breaking News'}
          </span>
        </div>

        <div
          className="
            min-w-0
            flex-1
            overflow-x-auto
          "
        >
          <div
            className="
              flex
              min-w-max
              items-center
            "
          >
            {activeItems.map(
              (
                item,
                index
              ) => {
                const href =
                  getHref(
                    item,
                    locale
                  );

                const external =
                  Boolean(
                    item.externalUrl &&
                    !item.story
                  );

                const content = (
                  <>
                    <span
                      className="
                        whitespace-nowrap
                        text-sm
                        font-semibold
                      "
                    >
                      {
                        item.headline
                      }
                    </span>

                    {external && (
                      <ExternalLink
                        className="
                          h-3.5
                          w-3.5
                          shrink-0
                        "
                        aria-hidden
                      />
                    )}
                  </>
                );

                return (
                  <div
                    key={
                      item.id
                    }
                    className="
                      flex
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
                          bg-white/25
                        "
                        aria-hidden
                      />
                    )}

                    {href ? (
                      external ? (
                        <a
                          href={
                            href
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="
                            inline-flex
                            items-center
                            gap-2
                            py-3
                            text-white
                            hover:underline
                            focus-visible:outline-none
                            focus-visible:underline
                          "
                        >
                          {content}
                        </a>
                      ) : (
                        <Link
                          href={
                            href
                          }
                          className="
                            inline-flex
                            items-center
                            gap-2
                            py-3
                            text-white
                            hover:underline
                            focus-visible:outline-none
                            focus-visible:underline
                          "
                        >
                          {content}
                        </Link>
                      )
                    ) : (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-2
                          py-3
                        "
                      >
                        {content}
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </section>
  );
}