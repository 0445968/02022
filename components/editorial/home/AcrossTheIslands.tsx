import Image from 'next/image';
import Link from 'next/link';

import {
  ArrowRight,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  HomeStory,
} from '@/lib/services/home';

import type {
  Locale,
} from '@/types';

type IslandDisplayStory =
  Pick<
    HomeStory,
    | 'id'
    | 'slug'
    | 'headline'
    | 'language'
    | 'publishedAt'
    | 'primaryCategory'
    | 'featuredImage'
  > & {
    summary?: string | null;
  };

interface AcrossTheIslandsProps {
  locale: Locale;

  sanAndres: IslandDisplayStory[];
  oldProvidence: IslandDisplayStory[];
  saintCatalina: IslandDisplayStory[];
}

interface IslandColumnProps {
  locale: Locale;

  title: string;
  href: string;

  stories: IslandDisplayStory[];
}

function getCategoryName(
  locale: Locale,
  story: IslandDisplayStory
) {
  if (
    !story.primaryCategory
  ) {
    return null;
  }

  return locale === 'es'
    ? story.primaryCategory.nameEs
    : story.primaryCategory.nameEn;
}

function StoryImage({
  story,
}: {
  story: IslandDisplayStory;
}) {
  if (
    !story.featuredImage
  ) {
    return (
      <div
        className="
          aspect-[16/10]
          w-full
          rounded-md
          bg-surface-subtle
        "
        aria-hidden
      />
    );
  }

  return (
    <div
      className="
        relative
        aspect-[16/10]
        w-full
        overflow-hidden
        rounded-md
        bg-surface-subtle
      "
    >
      <Image
        src={
          story.featuredImage.url
        }
        alt={
          story.featuredImage.altText ||
          story.headline
        }
        fill
        className="
          object-cover
          transition-transform
          duration-500
          group-hover:scale-[1.015]
        "
        sizes="
          (max-width: 768px) 100vw,
          (max-width: 1200px) 50vw,
          420px
        "
      />
    </div>
  );
}

function IslandLeadStory({
  locale,
  story,
}: {
  locale: Locale;
  story: IslandDisplayStory;
}) {
  const category =
    getCategoryName(
      locale,
      story
    );

  return (
    <article
      className="
        group
        min-w-0
      "
    >
      <Link
        href={localizedPath(
          locale,
          `/article/${story.slug}`
        )}
        className="
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <StoryImage
          story={
            story
          }
        />

        <div className="pt-3">
          {category && (
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.13em]
                text-breaking
              "
            >
              {category}
            </p>
          )}

          <h3
            className="
              mt-1.5
              font-headline
              text-xl
              font-bold
              leading-[1.12]
              tracking-[-0.02em]
              text-black
            "
          >
            {
              story.headline
            }
          </h3>

          {story.summary && (
            <p
              className="
                mt-2
                line-clamp-3
                text-sm
                leading-6
                text-muted-foreground
              "
            >
              {
                story.summary
              }
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

function IslandTextStory({
  locale,
  story,
}: {
  locale: Locale;
  story: IslandDisplayStory;
}) {
  const category =
    getCategoryName(
      locale,
      story
    );

  return (
    <article
      className="
        border-t
        border-border
        pt-4
      "
    >
      <Link
        href={localizedPath(
          locale,
          `/article/${story.slug}`
        )}
        className="
          group
          block
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        {category && (
          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.13em]
              text-breaking
            "
          >
            {category}
          </p>
        )}

        <h4
          className="
            mt-1.5
            font-headline
            text-base
            font-bold
            leading-[1.18]
            tracking-[-0.01em]
            text-black
            transition-opacity
            group-hover:opacity-65
          "
        >
          {
            story.headline
          }
        </h4>
      </Link>
    </article>
  );
}

function EmptyIsland({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <div
      className="
        border
        border-dashed
        border-border
        px-4
        py-8
        text-center
        text-sm
        text-muted-foreground
      "
    >
      {locale === 'es'
        ? 'No hay historias publicadas para esta isla todavía.'
        : 'No published stories for this island yet.'}
    </div>
  );
}

function IslandColumn({
  locale,
  title,
  href,
  stories,
}: IslandColumnProps) {
  const lead =
    stories[0] ??
    null;

  const secondary =
    stories.slice(
      1,
      4
    );

  return (
    <div
      className="
        min-w-0
      "
    >
      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          gap-4
          border-b-2
          border-black
          pb-2
        "
      >
        <h3
          className="
            font-headline
            text-xl
            font-bold
            tracking-[-0.02em]
            text-black
          "
        >
          {title}
        </h3>

        <Link
          href={
            href
          }
          className="
            inline-flex
            items-center
            gap-1
            text-[10px]
            font-bold
            uppercase
            tracking-[0.1em]
            text-muted-foreground
            transition-colors
            hover:text-black
          "
        >
          {locale === 'es'
            ? 'Ver más'
            : 'More'}

          <ArrowRight
            className="h-3.5 w-3.5"
            aria-hidden
          />
        </Link>
      </div>

      {lead ? (
        <>
          <IslandLeadStory
            locale={
              locale
            }
            story={
              lead
            }
          />

          {secondary.length >
            0 && (
            <div
              className="
                mt-4
                space-y-4
              "
            >
              {secondary.map(
                (
                  story
                ) => (
                  <IslandTextStory
                    key={
                      story.id
                    }
                    locale={
                      locale
                    }
                    story={
                      story
                    }
                  />
                )
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyIsland
          locale={
            locale
          }
        />
      )}
    </div>
  );
}

export function AcrossTheIslands({
  locale,
  sanAndres,
  oldProvidence,
  saintCatalina,
}: AcrossTheIslandsProps) {
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
          py-7
          lg:py-8
        "
      >
        <div
          className="
            mb-5
            border-b-2
            border-black
            pb-2
          "
        >
          <h2
            className="
              font-headline
              text-2xl
              font-bold
              tracking-[-0.025em]
              text-black
              sm:text-3xl
            "
          >
            {locale === 'es'
              ? 'A través de las islas'
              : 'Across the Islands'}
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Noticias y cobertura desde San Andrés, Old Providence y Saint Catalina.'
              : 'News and reporting from San Andrés, Old Providence and Saint Catalina.'}
          </p>
        </div>

        <div
          className="
            grid
            gap-7
            lg:grid-cols-3
            lg:gap-0
          "
        >
          <div
            className="
              lg:border-r
              lg:border-border
              lg:pr-6
            "
          >
            <IslandColumn
              locale={
                locale
              }
              title="San Andrés"
              href={localizedPath(
                locale,
                '/san-andres'
              )}
              stories={
                sanAndres
              }
            />
          </div>

          <div
            className="
              border-t
              border-border
              pt-6
              lg:border-r
              lg:border-t-0
              lg:px-6
              lg:pt-0
            "
          >
            <IslandColumn
              locale={
                locale
              }
              title="Old Providence"
              href={localizedPath(
                locale,
                '/old-providence'
              )}
              stories={
                oldProvidence
              }
            />
          </div>

          <div
            className="
              border-t
              border-border
              pt-6
              lg:border-t-0
              lg:pl-6
              lg:pt-0
            "
          >
            <IslandColumn
              locale={
                locale
              }
              title="Saint Catalina"
              href={localizedPath(
                locale,
                '/saint-catalina'
              )}
              stories={
                saintCatalina
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
