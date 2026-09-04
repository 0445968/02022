import Link from 'next/link';

import type {
  Locale,
} from '@/types';

import {
  EmptySlot,
  getArticleHref,
  getStory,
  StoryImage,
  type StorySource,
} from './LeadNewsGridShared';

interface LeadStoryColumnProps {
  locale: Locale;

  mainStory:
    | StorySource
    | null;

  featuredSupport:
    Array<
      StorySource | null
    >;

  moreCoverage:
    Array<
      StorySource | null
    >;
}

/* ========================================================= */
/* MAIN STORY */
/* ========================================================= */

function MainStory({
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
        className="min-h-[400px]"
      />
    );
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
          priority
          className="
            aspect-[16/9]
            w-full
          "
        />

        <h1
          className="
          mt-4
          font-headline
          text-[1.4rem]
          font-bold
          leading-[1.09]
          tracking-[-0.03em]
          text-black
          sm:text-[1.65rem]
          xl:text-[1.85rem]
        "
        >
          {story.headline}
        </h1>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* SUPPORTING HEADLINES */
/* ========================================================= */

function SupportingHeadline({
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
    <article
      className="
        border-t
        border-border
        py-3
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
          {story.headline}
        </h3>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* MORE COVERAGE */
/* ========================================================= */

function CoverageStory({
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

        <h3
          className="
            mt-2.5
            font-headline
            text-base
            font-medium
            leading-[1.16]
            tracking-[-0.015em]
            text-black
            transition-opacity
            group-hover:opacity-65
          "
        >
          {story.headline}
        </h3>
      </Link>
    </article>
  );
}

/* ========================================================= */
/* COLUMN */
/* ========================================================= */

export function LeadStoryColumn({
  locale,
  mainStory,
  featuredSupport,
  moreCoverage,
}: LeadStoryColumnProps) {
  return (
    <div className="min-w-0">
      <MainStory
        locale={locale}
        source={mainStory}
      />

      <div className="mt-4">
        <SupportingHeadline
          locale={locale}
          source={
            featuredSupport[0] ??
            null
          }
        />

        <SupportingHeadline
          locale={locale}
          source={
            featuredSupport[1] ??
            null
          }
        />
      </div>

      <div className="mt-5">
        <div
          className="
            grid
            gap-5
            sm:grid-cols-3
          "
        >
          <CoverageStory
            locale={locale}
            source={
              moreCoverage[0] ??
              null
            }
          />

          <CoverageStory
            locale={locale}
            source={
              moreCoverage[1] ??
              null
            }
          />

          <CoverageStory
            locale={locale}
            source={
              moreCoverage[2] ??
              null
            }
          />
        </div>
      </div>
    </div>
  );
}