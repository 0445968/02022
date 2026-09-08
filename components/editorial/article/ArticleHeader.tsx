import Link from 'next/link';

import type { Locale } from '@/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { StoryWithRelations } from '@/types/editorial';

import {
  categoryLabel,
  islandLabel,
} from '@/types/editorial';

import { localizedPath } from '@/lib/i18n/config';

interface ArticleHeaderProps {
  story: StoryWithRelations;
  locale: Locale;
  dict: Dictionary;
}

export function ArticleHeader({
  story,
  locale,
  dict,
}: ArticleHeaderProps) {
  const categoryName = story.primaryCategory
    ? categoryLabel(
        story.primaryCategory,
        locale
      )
    : null;

  const categoryHref = story.primaryCategory
    ? localizedPath(
        locale,
        `/category/${story.primaryCategory.slug}`
      )
    : null;

  const isSameAuthorEditor =
    story.author &&
    story.editor &&
    story.author.id === story.editor.id;

  return (
    <div
      className="
        bg-[linear-gradient(145deg,#010713_0%,#071a35_48%,hsl(var(--color-deep))_100%)]
        text-white/70
      "
    >
      {/* ======================================================
          TOP HEADER
      ====================================================== */}
      <header>
        <div className="container-wide">
          <div
            className="
              mx-auto
              grid
              max-w-[1180px]
              gap-8
              pt-10
              lg:grid-cols-[52px_minmax(0,42rem)_280px]
              lg:gap-8
              lg:pt-14
              xl:grid-cols-[64px_minmax(0,42rem)_320px]
              xl:gap-10
            "
          >
            {/* Empty left actions column */}
            <div className="hidden lg:block" />

            {/* ==================================================
                CATEGORY + HEADLINE
                Spans article + right rail
            ================================================== */}
            <div className="min-w-0 lg:col-span-2">
              {/* Category */}
              {categoryName &&
                categoryHref && (
                  <Link
                    href={categoryHref}
                    className="
                      font-interface
                      text-[0.68rem]
                      font-semibold
                      uppercase
                      tracking-[0.14em]
                      text-[hsl(var(--color-article-accent))]
                      transition-colors
                      hover:text-white
                    "
                  >
                    {categoryName}
                  </Link>
                )}

              {/* Headline */}
              <h1
  className="
    mt-5
    max-w-5xl
    font-headline
    text-[1.75rem]
    font-bold
    tracking-[-0.02em]
    text-white
    text-balance
    sm:text-[2.1rem]
    lg:text-[2.55rem]
    xl:text-[2.85rem]
  "
  style={{ lineHeight: '1.2' }}
>
  {story.headline}
</h1>
            </div>

            {/* Empty cells */}
            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
          </div>
        </div>
      </header>

      {/* ======================================================
          FEATURED IMAGE + METADATA
      ====================================================== */}
      <section>
  <div className="container-wide">
    <div
      className="
        mx-auto
        grid
        max-w-[1180px]
        gap-8
        pb-10
        pt-5
        lg:grid-cols-[52px_minmax(0,42rem)_280px]
        lg:items-stretch
        lg:gap-8
        lg:pb-12
        lg:pt-1
        xl:grid-cols-[64px_minmax(0,42rem)_320px]
        xl:gap-10
      "
    >
            {/* Empty left actions column */}
            <div className="hidden lg:block" />

            {/* ==================================================
                FEATURED IMAGE + CAPTION
            ================================================== */}
            <figure
              className="
                flex
                min-w-0
                flex-col
              "
            >
              {story.featuredImage && (
                <img
                  src={story.featuredImage.url}
                  alt={
                    story.featuredImage.altText ||
                    story.imageCaption ||
                    ''
                  }
                  className="
                    block
                    h-auto
                    w-full
                    rounded-
                    bg-surface-subtle
                    object-cover
                  "
                />
              )}

              {(story.imageCaption ||
                story.imageCredit) && (
                  <figcaption
                    className="
                      mt-3
                      font-interface
                      text-xs
                      leading-[1.55]
                      text-white/[0.5]
                    "
                  >
                    {story.imageCaption && (
                      <span>
                        {story.imageCaption}
                      </span>
                    )}

                    {story.imageCaption &&
                      story.imageCredit &&
                      ' '}

                    {story.imageCredit && (
                      <em>
                        ({story.imageCredit})
                      </em>
                    )}
                  </figcaption>
                )}
            </figure>

            {/* ==================================================
                METADATA PANEL
                Stretches to image + caption height
            ================================================== */}
            <aside className="min-w-0">
              <div
                className="
                  flex
                  h-full
                  flex-col
                  rounded-sm
                  bg-white/[0.05]
                  p-5
                  ring-1
                  ring-white/[0.08]
                  backdrop-blur-sm
                  lg:p-6
                "
              >
                {/* Summary */}
                {story.summary && (
                  <p
                    className="
                      font-body
                      text-[0.95rem]
                      leading-6
                      text-white/80
                    "
                  >
                    {story.summary}
                  </p>
                )}

                {/* Divider */}
                {story.summary && (
                  <div
                    className="
                      my-5
                      h-px
                      bg-white/15
                    "
                  />
                )}

                {/* Author / editor */}
<div className="font-interface">
  {story.author && (
    <div>
      {/* Author headshot */}
      <div
  className="
    flex
    h-11
    w-11
    items-center
    justify-center
    overflow-hidden
    rounded-full
    bg-white/10
    ring-1
    ring-white/10
  "
>
        {story.author.headshotUrl ? (
          <img
            src={story.author.headshotUrl}
            alt={
              story.author.name
                ? `${story.author.name} profile photo`
                : 'Author profile photo'
            }
            className="
  h-full
  w-full
  object-cover
  grayscale
"
          />
        ) : (
          <span
            className="
              text-sm
              font-semibold
              uppercase
              text-white/80
            "
          >
            {story.author.name
              ?.trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) =>
                part.charAt(0)
              )
              .join('') || '?'}
          </span>
        )}
      </div>

      {/* Author details */}
<div className="mt-3">
  <p
    className="
      text-sm
      leading-5
      text-white/55
    "
  >
    {dict.common.by}{' '}
    <span
      className="
        font-semibold
        text-white
      "
    >
      {story.author.name}
    </span>
  </p>

  {story.author.editorialTitle && (
    <p
      className="
        mt-0.5
        text-xs
        leading-4
        text-white/55
      "
    >
      {story.author.editorialTitle}
    </p>
  )}
</div>
    </div>
  )}

  {story.editor && !isSameAuthorEditor && (
    <p
      className="
        mt-4
        text-xs
        leading-5
        text-white/55
      "
    >
      {dict.common.editedBy}{' '}
      <span
        className="
          font-medium
          text-white/85
        "
      >
        {story.editor.name}
      </span>
    </p>
  )}
</div>
                {/* Metadata */}
                <div
                  className="
                    mt-auto
                    pt-6
                    font-interface
                    text-xs
                    leading-5
                    text-white/55
                  "
                >
                  {story.publishedAt && (
                    <p>
                      <time
                        dateTime={story.publishedAt}
                      >
                        {dict.common.published}{' '}

                        {new Date(
                          story.publishedAt
                        ).toLocaleDateString(
                          locale === 'es'
                            ? 'es'
                            : 'en',
                          {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </time>
                    </p>
                  )}

                  {story.updatedAt !==
                    story.publishedAt && (
                      <p className="mt-1">
                        <time
                          dateTime={story.updatedAt}
                        >
                          {dict.common.updated}{' '}

                          {new Date(
                            story.updatedAt
                          ).toLocaleDateString(
                            locale === 'es'
                              ? 'es'
                              : 'en',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </time>
                      </p>
                    )}

                  {story.language !== locale && (
                    <p
                      className="
                        mt-1
                        font-semibold
                        uppercase
                        tracking-wide
                        text-white/75
                      "
                    >
                      {story.language === 'en'
                        ? dict.common.languageEN
                        : dict.common.languageES}
                    </p>
                  )}

                  {story.island !== 'none' && (
                    <p className="mt-1">
                      {islandLabel(
                        story.island,
                        locale
                      )}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}