import Link from 'next/link';

import {
  ArrowRight,
  Globe2,
  Headphones,
  Play,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

import {
  getArticleHref,
  getCategory,
  getStory,
  StoryImage,
  type StorySource,
} from './LeadNewsGridShared';

interface HighlightsColumnProps {
  locale: Locale;

  highlightsStory:
    | StorySource
    | null;

  worldStories:
    StorySource[];
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
  return (
    <div>
      <div
        className="
          mb-4
          flex
          items-center
          gap-2
        "
      >
        <Play
          className="
            h-4
            w-4
            fill-current
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
            ? 'Lo más destacado de hoy'
            : "Today's Highlights"}
        </h3>
      </div>

      {source ? (
        <TodaysHighlightStory
          locale={locale}
          source={source}
        />
      ) : (
        <TodaysHighlightPlaceholder
          locale={locale}
        />
      )}
    </div>
  );
}

function TodaysHighlightPlaceholder({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <article className="group">
      <div
        className="
          relative
          aspect-video
          w-full
          overflow-hidden
          rounded-md
          bg-black
        "
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="
            h-full
            w-full
            object-cover
          "
        >
          <source
            src="/videos/todays-highlight-placeholder.mp4"
            type="video/mp4"
          />
        </video>

        <div
          className="
            pointer-events-none
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
            pointer-events-none
            absolute
            bottom-3
            left-3
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-white/95
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
        <h3
          className="
            font-headline
            text-lg
            font-semibold
            leading-[1.15]
            tracking-[-0.015em]
            text-black
          "
        >
          {locale === 'es'
            ? 'Historias destacadas de las islas'
            : 'Featured stories from across the islands'}
        </h3>
      </div>
    </article>
  );
}

function TodaysHighlightStory({
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
        <div className="relative">
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
          <h3
            className="
              font-headline
              text-lg
              font-semibold
              leading-[1.15]
              tracking-[-0.015em]
              text-black
              transition-opacity
              group-hover:opacity-65
            "
          >
            {story.headline}
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
        Clear Talks with Peter Bent
      </p>

      <Link
        href={
          localizedPath(
            locale,
            '/podcasts'
          )
        }
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
  isFirst = false,
}: {
  locale: Locale;
  source: StorySource | null;
  isFirst?: boolean;
}) {
  if (!source) {
    return null;
  }

  const story =
    getStory(
      source
    );

  const category =
    getCategory(
      locale,
      source
    );

  return (
    <article
      className={`
        border-b
        border-border
        py-4
        ${isFirst ? 'pt-0' : ''}
        last:border-b-0
      `}
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
            {story.headline}
          </h3>

          {category && (
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
              {category}
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
  return (
    <div className="mt-6">
      <div
        className="
          mb-2
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

      {stories.length > 0 ? (
        <>
          <WorldStory
            locale={locale}
            source={
              stories[0] ??
              null
            }
            isFirst
          />

          <WorldStory
            locale={locale}
            source={
              stories[1] ??
              null
            }
          />
        </>
      ) : (
        <div
          className="
            rounded-lg
            border
            border-dashed
            border-border
            bg-surface-muted/35
            px-4
            py-5
            text-sm
            leading-5
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Selecciona historias de Mundo en el editor de portada.'
            : 'Select World stories in the front-page editor.'}
        </div>
      )}
    </div>
  );
}

/* ========================================================= */
/* COLUMN */
/* ========================================================= */

export function HighlightsColumn({
  locale,
  highlightsStory,
  worldStories,
}: HighlightsColumnProps) {
  return (
    <div className="min-w-0">
      <TodaysHighlights
        locale={locale}
        source={highlightsStory}
      />

      <div className="mt-6">
        <LatestPodcast
          locale={locale}
        />
      </div>

      <WorldCoverage
        locale={locale}
        stories={worldStories}
      />
    </div>
  );
}