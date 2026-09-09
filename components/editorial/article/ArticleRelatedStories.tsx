import Image from 'next/image';
import Link from 'next/link';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

import type {
  PublicStoryListItem,
} from '@/types/editorial';

interface ArticleRelatedStoriesProps {
  stories: PublicStoryListItem[];
  locale: Locale;
  title: string;
}

function formatStoryDate(
  date: string | null,
  locale: Locale
) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(
    locale === 'es'
      ? 'es-CO'
      : 'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  ).format(
    new Date(date)
  );
}

export function ArticleRelatedStories({
  stories,
  locale,
  title,
}: ArticleRelatedStoriesProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section
      className="
        border-t
        border-border
        bg-surface-muted
      "
    >
      <div className="container-wide py-10 lg:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div
            className="
              mb-6
              border-b
              border-border
              pb-3
            "
          >
            <h2
              className="
                font-headline
                text-xl
                font-bold
                tracking-[-0.02em]
                text-deep
                sm:text-2xl
              "
            >
              {title}
            </h2>
          </div>

          <div
            className="
              grid
              gap-x-6
              gap-y-8
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            {stories
              .slice(0, 4)
              .map(
                (story) => {
                  const href =
                    localizedPath(
                      locale,
                      `/article/${story.slug}`
                    );

                  const categoryName =
                    locale === 'es'
                      ? story
                          .primaryCategoryNameEs
                      : story
                          .primaryCategoryNameEn;

                  const date =
                    formatStoryDate(
                      story.publishedAt,
                      locale
                    );

                  return (
                    <article
                      key={story.id}
                      className="min-w-0"
                    >
                      <Link
                        href={href}
                        className="
                          group
                          block
                        "
                      >
                        <div
                          className="
                            relative
                            aspect-[4/3]
                            overflow-hidden
                            rounded-lg
                            bg-surface-subtle
                          "
                        >
                          {story.featuredImageUrl ? (
                            <Image
                              src={
                                story.featuredImageUrl
                              }
                              alt={
                                story.featuredImageAlt ||
                                story.headline
                              }
                              fill
                              sizes="
                                (max-width: 639px) 100vw,
                                (max-width: 1023px) 50vw,
                                25vw
                              "
                              className="
                                object-cover
                                transition-transform
                                duration-300
                                group-hover:scale-[1.025]
                              "
                            />
                          ) : (
                            <div
                              className="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                px-5
                                text-center
                              "
                            >
                              <span
                                className="
                                  font-interface
                                  text-[0.7rem]
                                  font-semibold
                                  uppercase
                                  tracking-[0.08em]
                                  text-muted-foreground
                                "
                              >
                                West Island Times
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4">
                          {categoryName && (
                            <p
                              className="
                                font-interface
                                text-[0.68rem]
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-primary
                              "
                            >
                              {
                                categoryName
                              }
                            </p>
                          )}

                          <h3
                            className="
                              mt-2
                              font-headline
                              text-[1.05rem]
                              font-semibold
                              leading-[1.15]
                              tracking-[-0.02em]
                              text-foreground/90
                              transition-colors
                              group-hover:text-primary
                              sm:text-[1.05rem]
                            "
                          >
                            {
                              story.headline
                            }
                          </h3>

                          {date && (
                            <p
                              className="
                                mt-3
                                font-interface
                                text-[0.72rem]
                                text-muted-foreground
                              "
                            >
                              {date}
                            </p>
                          )}
                        </div>
                      </Link>
                    </article>
                  );
                }
              )}
          </div>
        </div>
      </div>
    </section>
  );
}