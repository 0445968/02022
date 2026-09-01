import Link from 'next/link';

import {
  ArrowRight,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  FrontPageStoryOption,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface LatestNewsRailProps {
  locale: Locale;

  stories: FrontPageStoryOption[];

  limit?: number;
}

function formatTime(
  locale: Locale,
  value: string | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    locale === 'es'
      ? 'es-CO'
      : 'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date);
}

function getCategoryName(
  locale: Locale,
  story: FrontPageStoryOption
) {
  const category =
    story.primaryCategory;

  if (!category) {
    return null;
  }

  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

export function LatestNewsRail({
  locale,
  stories,
  limit = 8,
}: LatestNewsRailProps) {
  const latestStories =
    [...stories]
      .filter(
        (story) =>
          story.publishedAt
      )
      .sort(
        (a, b) => {
          const aTime =
            a.publishedAt
              ? new Date(
                  a.publishedAt
                ).getTime()
              : 0;

          const bTime =
            b.publishedAt
              ? new Date(
                  b.publishedAt
                ).getTime()
              : 0;

          return (
            bTime -
            aTime
          );
        }
      )
      .slice(
        0,
        limit
      );

  return (
    <section
      className="
        border-b
        border-border
        bg-white
      "
    >
      <div
        className="
          container-wide
          py-6
          lg:py-8
        "
      >
        <div
          className="
            border-b-2
            border-deep
            pb-2
          "
        >
          <div
            className="
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <h2
                className="
                  font-headline
                  text-2xl
                  font-bold
                  tracking-[-0.02em]
                  text-black
                  sm:text-3xl
                "
              >
                {locale === 'es'
                  ? 'Últimas noticias'
                  : 'Latest News'}
              </h2>

              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-breaking
                "
                aria-hidden
              />
            </div>

            <Link
              href={localizedPath(
                locale,
                '/latest'
              )}
              className="
                hidden
                items-center
                gap-1
                text-xs
                font-bold
                uppercase
                tracking-[0.1em]
                text-black
                transition-colors
                hover:text-primary
                sm:inline-flex
              "
            >
              {locale === 'es'
                ? 'Ver todo'
                : 'View all'}

              <ArrowRight
                className="h-4 w-4"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        {latestStories.length >
        0 ? (
          <div
            className="
              divide-y
              divide-border
            "
          >
            {latestStories.map(
              (
                story
              ) => {
                const time =
                  formatTime(
                    locale,
                    story.publishedAt
                  );

                const category =
                  getCategoryName(
                    locale,
                    story
                  );

                return (
                  <article
                    key={
                      story.id
                    }
                  >
                    <Link
                      href={localizedPath(
                        locale,
                        `/article/${story.slug}`
                      )}
                      className="
                        group
                        grid
                        gap-2
                        py-3.5
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-primary
                        sm:grid-cols-[72px_minmax(0,1fr)_150px]
                        sm:items-start
                        sm:gap-4
                      "
                    >
                      <div>
                        {time && (
                          <span
                            className="
                              text-xs
                              font-bold
                              tabular-nums
                              text-breaking
                            "
                          >
                            {time}
                          </span>
                        )}
                      </div>

                      <h3
                        className="
                          font-headline
                          text-base
                          font-bold
                          leading-[1.2]
                          tracking-[-0.01em]
                          text-black
                          transition-colors
                          group-hover:text-primary
                          sm:text-lg
                        "
                      >
                        {
                          story.headline
                        }
                      </h3>

                      <div
                        className="
                          hidden
                          justify-end
                          sm:flex
                        "
                      >
                        {category && (
                          <span
                            className="
                              text-right
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-muted-foreground
                            "
                          >
                            {category}
                          </span>
                        )}
                      </div>
                    </Link>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div
            className="
              py-8
              text-sm
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'No hay noticias publicadas todavía.'
              : 'No published stories yet.'}
          </div>
        )}

        <div className="mt-4 sm:hidden">
          <Link
            href={localizedPath(
              locale,
              '/latest'
            )}
            className="
              inline-flex
              items-center
              gap-1
              text-xs
              font-bold
              uppercase
              tracking-[0.1em]
              text-black
            "
          >
            {locale === 'es'
              ? 'Ver todas las noticias'
              : 'View all news'}

            <ArrowRight
              className="h-4 w-4"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}