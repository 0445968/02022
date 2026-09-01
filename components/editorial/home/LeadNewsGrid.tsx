import Image from 'next/image';
import Link from 'next/link';

import {
  ArrowRight,
  Clock3,
  Globe2,
  Headphones,
  Play,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface LeadNewsGridProps {
  locale: Locale;

  lead: HomepagePlacement | null;

  topLeft: HomepagePlacement | null;
  topRight: HomepagePlacement | null;

  secondary: Array<
    HomepagePlacement | null
  >;

  videoFeature:
    | HomepagePlacement
    | null;

    latestStories?: FrontPageStoryOption[];
}

type StorySource =
  | HomepagePlacement
  | FrontPageStoryOption;

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function getStory(
  source: StorySource
): FrontPageStoryOption {
  if (
    'story' in source
  ) {
    return source.story;
  }

  return source;
}

function getArticleHref(
  locale: Locale,
  source: StorySource
) {
  const story =
    getStory(source);

  return localizedPath(
    locale,
    `/article/${story.slug}`
  );
}

function getCategory(
  locale: Locale,
  source: StorySource
) {
  const story =
    getStory(source);

  const category =
    story.primaryCategory;

  if (!category) {
    return null;
  }

  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

function formatPublishedDate(
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
      month: 'short',
      day: 'numeric',
    }
  ).format(date);
}

/* ========================================================= */
/* SECTION HEADING */
/* ========================================================= */

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        mb-4
        flex
        items-center
        gap-2
      "
    >
      <span
        className="
          h-5
          w-[4px]
          bg-black
        "
        aria-hidden
      />

      <h2
        className="
          text-sm
          font-black
          uppercase
          tracking-[-0.01em]
          text-black
        "
      >
        {children}
      </h2>
    </div>
  );
}

/* ========================================================= */
/* IMAGE */
/* ========================================================= */

function StoryImage({
  source,
  className = '',
  priority = false,
}: {
  source: StorySource;
  className?: string;
  priority?: boolean;
}) {
  const story =
    getStory(source);

  const image =
    story.featuredImage;

  if (!image) {
    return (
      <div
        className={`
          rounded-md
          bg-surface-subtle
          ${className}
        `}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-md
        bg-surface-subtle
        ${className}
      `}
    >
      <Image
        src={
          image.url
        }
        alt={
          image.altText ||
          story.headline
        }
        fill
        priority={
          priority
        }
        className="
          object-cover
          transition-transform
          duration-500
          group-hover:scale-[1.015]
        "
        sizes="
          (max-width: 768px) 100vw,
          (max-width: 1280px) 55vw,
          760px
        "
      />
    </div>
  );
}

/* ========================================================= */
/* STORY META */
/* ========================================================= */

function StoryMeta({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource;
}) {
  const story =
    getStory(source);

  const published =
    formatPublishedDate(
      locale,
      story.publishedAt
    );

  const category =
    getCategory(
      locale,
      source
    );

  return (
    <div
      className="
        flex
        flex-wrap
        items-center
        gap-x-2
        gap-y-1
      "
    >
      {category && (
        <span
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-breaking
          "
        >
          {category}
        </span>
      )}

      {category &&
        published && (
          <span
            className="
              h-1
              w-1
              rounded-full
              bg-muted-foreground/40
            "
          />
        )}

      {published && (
        <span
          className="
            inline-flex
            items-center
            gap-1
            text-[10px]
            font-medium
            uppercase
            tracking-[0.06em]
            text-muted-foreground
          "
        >
          <Clock3
            className="
              h-3
              w-3
            "
            aria-hidden
          />

          {published}
        </span>
      )}
    </div>
  );
}

/* ========================================================= */
/* EMPTY SLOT */
/* ========================================================= */

function EmptySlot({
  locale,
  className = '',
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    <div
      className={`
        flex
        min-h-[120px]
        items-center
        justify-center
        rounded-md
        bg-surface-subtle
        px-4
        text-center
        text-xs
        text-muted-foreground
        ${className}
      `}
    >
      {locale === 'es'
        ? 'Historia no configurada'
        : 'Story not configured'}
    </div>
  );
}

/* ========================================================= */
/* MORE TOP STORIES */
/* ========================================================= */

function TopStoryFeature({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return (
      <EmptySlot
        locale={locale}
        className="min-h-[220px]"
      />
    );
  }

  const story =
    getStory(source);

  return (
    <article className="group">
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <StoryImage
          source={source}
          className="
            aspect-[16/10]
            w-full
          "
        />

        <h3
          className="
            mt-3
            font-headline
            text-xl
            font-semibold
            leading-[1.13]
            tracking-[-0.02em]
            text-black
          "
        >
          {
            story.headline
          }
        </h3>
      </Link>
    </article>
  );
}

function TopStoryHeadline({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return null;
  }

  const story =
    getStory(source);

  return (
    <article
      className="
        border-t
        border-border
        py-4
      "
    >
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          group
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <h3
          className="
            line-clamp-3
            font-headline
            text-[17px]
            font-medium
            leading-[1.22]
            tracking-[-0.015em]
            text-black
            transition-opacity
            group-hover:opacity-65
          "
        >
          {
            story.headline
          }
        </h3>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* MAIN CENTER STORY */
/* ========================================================= */

function MainStory({
  locale,
  placement,
}: {
  locale: Locale;
  placement: HomepagePlacement | null;
}) {
  if (!placement) {
    return (
      <EmptySlot
        locale={locale}
        className="min-h-[400px]"
      />
    );
  }

  return (
    <article className="group">
      <Link
        href={getArticleHref(
          locale,
          placement
        )}
        className="
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <StoryMeta
          locale={locale}
          source={placement}
        />

        <StoryImage
          source={placement}
          priority
          className="
            mt-3
            aspect-[16/9]
            w-full
          "
        />

        <h1
          className="
            mt-4
            font-headline
            text-[2rem]
            font-bold
            leading-[1.04]
            tracking-[-0.03em]
            text-black
            sm:text-[2.35rem]
            xl:text-[2.65rem]
          "
        >
          {
            placement.story
              .headline
          }
        </h1>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* SMALL HEADLINES BELOW FEATURED STORY */
/* ========================================================= */

function SmallSupportingHeadline({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return null;
  }

  const story =
    getStory(source);

  return (
    <article
      className="
        border-t
        border-border
        py-3
      "
    >
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          group
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <h3
          className="
            font-headline
            text-sm
            font-medium
            leading-[1.3]
            text-black
            transition-opacity
            group-hover:opacity-65
            sm:text-[15px]
          "
        >
          {
            story.headline
          }
        </h3>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* MORE COVERAGE */
/* ========================================================= */

function MiniStory({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return (
      <EmptySlot
        locale={locale}
        className="min-h-[180px]"
      />
    );
  }

  const story =
    getStory(source);

  return (
    <article className="group">
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <StoryImage
          source={source}
          className="
            aspect-[16/10]
            w-full
          "
        />

        <h3
          className="
            mt-2.5
            font-headline
            text-base
            font-medium
            leading-[1.16]
            tracking-[-0.015em]
            text-black
          "
        >
          {
            story.headline
          }
        </h3>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* TODAY'S HIGHLIGHTS */
/* ========================================================= */

function TodaysHighlights({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return (
      <EmptySlot
        locale={locale}
        className="min-h-[250px]"
      />
    );
  }

  const story =
    getStory(source);

  return (
    <article className="group">
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <div
          className="
            relative
          "
        >
          <StoryImage
            source={source}
            className="
              aspect-video
              w-full
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-black/45
              via-transparent
              to-transparent
            "
          />

          <div
            className="
              absolute
              bottom-3
              left-3
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
            "
          >
            <Play
              className="
                ml-0.5
                h-4
                w-4
                fill-current
              "
              aria-hidden
            />
          </div>
        </div>

        <div className="pt-3">
          <span
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.12em]
              text-breaking
            "
          >
            {locale === 'es'
              ? 'Lo más destacado de hoy'
              : "Today's Highlights"}
          </span>

          <h3
            className="
              mt-1.5
              font-headline
              text-lg
              font-semibold
              leading-[1.15]
              tracking-[-0.015em]
              text-black
            "
          >
            {
              story.headline
            }
          </h3>
        </div>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* PODCAST */
/* ========================================================= */

function LatestPodcast({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <div
      className="
        rounded-md
        bg-black
        p-5
        text-white
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <Headphones
          className="
            h-4
            w-4
            text-white/65
          "
          aria-hidden
        />

        <span
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.12em]
            text-white/60
          "
        >
          {locale === 'es'
            ? 'Último episodio'
            : 'Latest Podcast'}
        </span>
      </div>

      <h3
        className="
          mt-3
          font-headline
          text-xl
          font-bold
          leading-[1.1]
          tracking-[-0.02em]
          text-white
        "
      >
        {locale === 'es'
          ? 'Las historias que están dando forma a las islas'
          : 'The stories shaping the islands'}
      </h3>

      <p
        className="
          mt-2
          text-xs
          leading-5
          text-white/60
        "
      >
        West Island Times Daily
      </p>

      <Link
        href={localizedPath(
          locale,
          '/podcasts'
        )}
        className="
          mt-5
          inline-flex
          items-center
          gap-2
          rounded-md
          bg-white
          px-3.5
          py-2
          text-[10px]
          font-black
          uppercase
          tracking-[0.08em]
          text-black
          transition-opacity
          hover:opacity-85
        "
      >
        <Play
          className="
            h-3
            w-3
            fill-current
          "
          aria-hidden
        />

        {locale === 'es'
          ? 'Escuchar episodio'
          : 'Listen to episode'}

        <ArrowRight
          className="
            h-3.5
            w-3.5
          "
          aria-hidden
        />
      </Link>
    </div>
  );
}

/* ========================================================= */
/* WORLD COVERAGE */
/* ========================================================= */

function WorldStory({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource | null;
}) {
  if (!source) {
    return null;
  }

  const story =
    getStory(source);

  return (
    <article
      className="
        border-b
        border-border
        py-4
        first:pt-0
        last:border-b-0
      "
    >
      <Link
        href={getArticleHref(
          locale,
          source
        )}
        className="
          group
          grid
          grid-cols-[100px_minmax(0,1fr)]
          gap-3
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <StoryImage
          source={source}
          className="
            aspect-[4/3]
            w-full
          "
        />

        <div className="min-w-0">
          <h3
            className="
              line-clamp-3
              font-headline
              text-[15px]
              font-medium
              leading-[1.18]
              text-black
              transition-opacity
              group-hover:opacity-65
            "
          >
            {
              story.headline
            }
          </h3>

          {getCategory(
            locale,
            source
          ) && (
            <p
              className="
                mt-2
                text-[9px]
                font-black
                uppercase
                tracking-[0.1em]
                text-muted-foreground
              "
            >
              {getCategory(
                locale,
                source
              )}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

function WorldCoverage({
  locale,
  stories,
}: {
  locale: Locale;
  stories: StorySource[];
}) {
  if (
    stories.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      className="
        mt-6
        border-t
        border-border
        pt-5
      "
    >
      <div
        className="
          mb-4
          flex
          items-center
          gap-2
        "
      >
        <Globe2
          className="
            h-4
            w-4
            text-black
          "
          aria-hidden
        />

        <h3
          className="
            text-[11px]
            font-black
            uppercase
            tracking-[0.1em]
            text-black
          "
        >
          {locale === 'es'
            ? 'Cobertura mundial'
            : 'World Coverage'}
        </h3>
      </div>

      <WorldStory
        locale={locale}
        source={
          stories[0] ??
          null
        }
      />

      <WorldStory
        locale={locale}
        source={
          stories[1] ??
          null
        }
      />
    </div>
  );
}

/* ========================================================= */
/* MAIN COMPONENT */
/* ========================================================= */

export function LeadNewsGrid({
    locale,
    lead,
    topLeft,
    topRight,
    secondary,
    videoFeature,
    latestStories = [],
  }: LeadNewsGridProps) {
  const secondaryOne =
    secondary[0] ??
    null;

  const secondaryTwo =
    secondary[1] ??
    null;

  const secondaryThree =
    secondary[2] ??
    null;

  /* ======================================================= */
  /* BUILD FALLBACK POOL */
  /* ======================================================= */

  const curatedStoryIds =
    new Set(
      [
        lead,
        topLeft,
        topRight,
        secondaryOne,
        secondaryTwo,
        secondaryThree,
        videoFeature,
      ]
        .filter(
          (
            placement
          ): placement is HomepagePlacement =>
            Boolean(placement)
        )
        .map(
          (
            placement
          ) =>
            placement.story.id
        )
    );

  const fallbackStories =
    latestStories.filter(
      (
        story
      ) =>
        !curatedStoryIds.has(
          story.id
        )
    );

  /* ======================================================= */
  /* MORE TOP STORIES */
  /* ======================================================= */

  const moreTopFeature:
    StorySource | null =
      topLeft ??
      fallbackStories[0] ??
      null;

  const moreTopText: Array<
    StorySource | null
  > = [
    secondaryOne ??
      fallbackStories[1] ??
      null,

    secondaryTwo ??
      fallbackStories[2] ??
      null,

    secondaryThree ??
      fallbackStories[3] ??
      null,
  ];

  /* ======================================================= */
  /* FEATURED SUPPORTING HEADLINES */
  /* ======================================================= */

  const featuredSupportOne:
    StorySource | null =
      topRight ??
      fallbackStories[4] ??
      fallbackStories[0] ??
      null;

  const featuredSupportTwo:
    StorySource | null =
      fallbackStories[5] ??
      fallbackStories[6] ??
      fallbackStories[1] ??
      null;

  /* ======================================================= */
  /* MORE COVERAGE */
  /* ======================================================= */

  const moreCoverageOne:
    StorySource | null =
      topLeft ??
      fallbackStories[7] ??
      fallbackStories[2] ??
      null;

  const moreCoverageTwo:
    StorySource | null =
      secondaryTwo ??
      fallbackStories[8] ??
      fallbackStories[3] ??
      null;

  const moreCoverageThree:
    StorySource | null =
      secondaryThree ??
      fallbackStories[9] ??
      fallbackStories[4] ??
      null;

  /* ======================================================= */
  /* TODAY'S HIGHLIGHTS */
  /* ======================================================= */

  const highlightsStory:
    StorySource | null =
      videoFeature ??
      fallbackStories[10] ??
      fallbackStories[0] ??
      null;

  /* ======================================================= */
  /* WORLD COVERAGE */
  /* ======================================================= */

  const worldStories =
    [
      fallbackStories[11] ??
        fallbackStories[5] ??
        null,

      fallbackStories[12] ??
        fallbackStories[6] ??
        null,
    ].filter(
      (
        story
      ): story is StorySource =>
        Boolean(story)
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
        "
      >
        <div
          className="
            grid
            gap-7
            xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.55fr)_minmax(260px,0.72fr)]
          "
        >
          {/* ================================================= */}
          {/* LEFT — MORE TOP STORIES */}
          {/* ================================================= */}

          <aside
            className="
              min-w-0
              xl:border-r
              xl:border-border
              xl:pr-6
            "
          >
            

            <TopStoryFeature
              locale={locale}
              source={
                moreTopFeature
              }
            />

            <div className="mt-4">
              {moreTopText.map(
                (
                  story,
                  index
                ) => (
                  <TopStoryHeadline
                    key={
                      story
                        ? getStory(
                            story
                          ).id
                        : `top-story-${index}`
                    }
                    locale={
                      locale
                    }
                    source={
                      story
                    }
                  />
                )
              )}
            </div>
          </aside>

          {/* ================================================= */}
          {/* CENTER — FEATURED STORY */}
          {/* ================================================= */}

          <main
            className="
              min-w-0
              xl:border-r
              xl:border-border
              xl:pr-7
            "
          >

            <MainStory
              locale={locale}
              placement={lead}
            />

            {/* Smaller headlines below main headline */}

            <div className="mt-4">
              <SmallSupportingHeadline
                locale={locale}
                source={
                  featuredSupportOne
                }
              />

              <SmallSupportingHeadline
                locale={locale}
                source={
                  featuredSupportTwo
                }
              />
            </div>

            {/* ================================================= */}
            {/* MORE COVERAGE */}
            {/* ================================================= */}

            <div className="mt-5">
              

              <div
                className="
                  grid
                  gap-5
                  sm:grid-cols-3
                "
              >
                <MiniStory
                  locale={
                    locale
                  }
                  source={
                    moreCoverageOne
                  }
                />

                <MiniStory
                  locale={
                    locale
                  }
                  source={
                    moreCoverageTwo
                  }
                />

                <MiniStory
                  locale={
                    locale
                  }
                  source={
                    moreCoverageThree
                  }
                />
              </div>
            </div>
          </main>

          {/* ================================================= */}
          {/* RIGHT — HIGHLIGHTS + PODCAST + WORLD */}
          {/* ================================================= */}

          <aside
            className="
              min-w-0
            "
          >
           

            <TodaysHighlights
              locale={locale}
              source={
                highlightsStory
              }
            />

            <div
              className="
                my-6
                border-t
                border-border
              "
            />

            <LatestPodcast
              locale={
                locale
              }
            />

            <WorldCoverage
              locale={
                locale
              }
              stories={
                worldStories
              }
            />
          </aside>
        </div>
      </div>
    </section>
  );
}