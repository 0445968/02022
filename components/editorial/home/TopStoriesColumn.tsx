import Link from 'next/link';

import type {
  Locale,
} from '@/types';

import {
  getArticleHref,
  getStory,
  StoryImage,
  type StorySource,
} from './LeadNewsGridShared';

interface TopStoriesColumnProps {
  locale: Locale;

  featured:
    | StorySource
    | null;

  stories:
    Array<
      StorySource | null
    >;
}

function FeaturedTopStory({
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
    getStory(
      source
    );

  return (
    <article className="group">
      <Link
        href={
          getArticleHref(
            locale,
            source
          )
        }
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

        <h2
          className="
            mt-3
            font-headline
            text-[18px]
            font-semibold
            leading-[1.15]
            tracking-[-0.02em]
            text-black
            transition-opacity
            group-hover:opacity-65
          "
        >
          {story.headline}
        </h2>
      </Link>
    </article>
  );
}

function MoreTopStory({
  locale,
  source,
}: {
  locale: Locale;
  source: StorySource;
}) {
  const story =
    getStory(
      source
    );

  return (
    <article
      className="
        border-b
        border-black/10
        last:border-b-0
      "
    >
      <Link
        href={
          getArticleHref(
            locale,
            source
          )
        }
        className="
          group
          flex
          items-start
          gap-3
          py-3.5
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
        "
      >
        <span
          className="
            mt-[0.42rem]
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            bg-primary
          "
          aria-hidden
        />

        <h3
          className="
            line-clamp-3
            font-headline
            text-[14px]
            font-semibold
            leading-[1.22]
            tracking-[-0.012em]
            text-black
            transition-opacity
            group-hover:opacity-60
          "
        >
          {story.headline}
        </h3>
      </Link>
    </article>
  );
}

export function TopStoriesColumn({
  locale,
  featured,
  stories,
}: TopStoriesColumnProps) {
  const remainingStories =
    stories.filter(
      (
        story
      ): story is StorySource =>
        story !== null
    );

  return (
    <div className="min-w-0">
      {/* ===================================================== */}
      {/* FEATURED TOP STORY */}
      {/* ===================================================== */}

      <FeaturedTopStory
        locale={locale}
        source={featured}
      />

      {/* ===================================================== */}
      {/* MORE TOP STORIES */}
      {/* ===================================================== */}

      {remainingStories.length >
        0 && (
        <section
          className="
            mt-5
            overflow-hidden
            rounded-md
            bg-surface-muted
          "
        >
          <div
            className="
              bg-deep
              px-4
              py-3
            "
          >
            <h2
              className="
                font-headline
                text-[13px]
                font-bold
                uppercase
                tracking-[0.04em]
                text-white
              "
            >
              {locale === 'es'
                ? 'Más noticias principales'
                : 'More Top Stories'}
            </h2>
          </div>

          <div className="px-4">
            {remainingStories.map(
              (source) => (
                <MoreTopStory
                  key={
                    getStory(
                      source
                    ).id
                  }
                  locale={locale}
                  source={source}
                />
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}