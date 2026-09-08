import Link from 'next/link';

import type { Locale } from '@/types';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  PublicStoryListItem,
} from '@/types/editorial';

import {
  localizedPath,
} from '@/lib/i18n/config';

interface ArticleRightRailProps {
  locale: Locale;
  dict: Dictionary;
  trendingStories: PublicStoryListItem[];
}

export function ArticleRightRail({
  locale,
  trendingStories,
}: ArticleRightRailProps) {
  const visibleTrending =
    trendingStories.slice(0, 5);

  const subscribeHref =
    localizedPath(
      locale,
      '/subscribe'
    );

  return (
    <aside
      className="
        hidden
        min-w-0
        self-stretch
        lg:block
      "
    >
      {/*
       * This wrapper needs to occupy the full height
       * of the article grid row so that the sticky
       * Trending section has room to remain sticky.
       */}
      <div
        className="
          h-full
          space-y-8
        "
      >
        {/* ======================================================
            SUBSCRIBE
        ====================================================== */}

        <section
          className="
            rounded-2xl
            bg-[#EAF5FF]
            p-6
            text-deep
          "
        >
          <p
            className="
              font-interface
              text-[0.68rem]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-primary
            "
          >
            West Island Times
          </p>

          <h2
            className="
              mt-3
              font-headline
              text-2xl
              font-bold
              leading-[1.1]
              tracking-[-0.02em]
              text-deep
            "
          >
            Be the first to know
            what&apos;s happening
          </h2>

          <p
            className="
              mt-3
              font-body
              text-sm
              leading-6
              text-deep/70
            "
          >
            Get important stories,
            local reporting, and
            updates from across the
            Archipelago.
          </p>

          {/*
           * Keep this vertical.
           *
           * The sidebar is only around 280–320px wide.
           * Using sm:flex-row here would trigger based
           * on the viewport width and squeeze the form.
           */}
          <form
            action={subscribeHref}
            method="get"
            className="
              mt-6
              flex
              w-full
              flex-col
              gap-3
            "
          >
            <div className="relative w-full">
              <label
                htmlFor="newsletter-email"
                className="sr-only"
              >
                Email address
              </label>

              <input
                id="newsletter-email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
                autoComplete="email"
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-blue-200/70
                  bg-white
                  px-5
                  font-body
                  text-sm
                  text-deep
                  outline-none
                  transition-all
                  placeholder:text-deep/40
                  focus:border-[hsl(var(--color-article-accent))]
                  focus:ring-1
                  focus:ring-[hsl(var(--color-article-accent))]
                "
              />
            </div>

            <button
              type="submit"
              className="
                inline-flex
                h-11
                w-full
                items-center
                justify-center
                rounded-xl
                bg-[hsl(var(--color-article-accent))]
                px-6
                font-interface
                text-sm
                font-semibold
                text-white
                transition-all
                hover:opacity-90
                focus:outline-none
                focus:ring-2
                focus:ring-[hsl(var(--color-article-accent))]
                focus:ring-offset-2
                focus:ring-offset-[#EAF5FF]
              "
            >
              Subscribe
            </button>
          </form>
        </section>

        {/* ======================================================
            ADVERTISEMENT
        ====================================================== */}

        <section>
          <div
            className="
              mb-2
              font-interface
              text-[0.6rem]
              font-medium
              uppercase
              tracking-[0.14em]
              text-muted-foreground
            "
          >
            Advertisement
          </div>

          <div
            className="
              flex
              aspect-[4/3]
              w-full
              items-center
              justify-center
              border
              border-border
              bg-surface-muted
              px-6
              text-center
            "
          >
            <p
              className="
                font-interface
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              Advertisement space
            </p>
          </div>
        </section>

        {/* ======================================================
            TRENDING
        ====================================================== */}

        <div
          className="
            sticky
            top-32
            h-fit
          "
        >
          <section
            className="
              bg-white
              pb-2
            "
          >
            {/* Header */}
            <div
              className="
                flex
                items-center
                gap-3
                border-t
                border-border
                pt-5
              "
            >
              <span
                className="
                  h-5
                  w-[3px]
                  shrink-0
                  rounded-full
                  bg-[hsl(var(--color-article-accent))]
                "
                aria-hidden="true"
              />

              <h2
                className="
                  font-interface
                  text-[0.72rem]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-deep
                "
              >
                Trending
              </h2>
            </div>

            {/* Stories */}
            <div className="mt-4">
              {visibleTrending.length >
              0 ? (
                visibleTrending.map(
                  (
                    story,
                    index
                  ) => (
                    <TrendingStory
                      key={story.id}
                      story={story}
                      index={index}
                      locale={locale}
                    />
                  )
                )
              ) : (
                <p
                  className="
                    font-body
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  No trending stories
                  available.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}

interface TrendingStoryProps {
  story: PublicStoryListItem;
  index: number;
  locale: Locale;
}

function TrendingStory({
  story,
  index,
  locale,
}: TrendingStoryProps) {
  const href =
    localizedPath(
      locale,
      `/article/${story.slug}`
    );

  const categoryName =
    locale === 'es'
      ? story.primaryCategoryNameEs
      : story.primaryCategoryNameEn;

  return (
    <article
      className="
        grid
        grid-cols-[2rem_minmax(0,1fr)]
        gap-3
        border-b
        border-border
        py-4
        first:pt-0
        last:border-b-0
      "
    >
      {/* Number */}
      <div
        className="
          pt-0.5
          font-interface
          text-sm
          font-bold
          leading-none
          text-[hsl(var(--color-article-accent))]
        "
      >
        {String(
          index + 1
        ).padStart(
          2,
          '0'
        )}
      </div>

      {/* Story */}
      <div className="min-w-0">
        {categoryName && (
          <p
            className="
              mb-1.5
              font-interface
              text-[0.62rem]
              font-semibold
              uppercase
              tracking-[0.1em]
              text-primary
            "
          >
            {categoryName}
          </p>
        )}

        <Link
          href={href}
          className="
            block
            font-headline
            text-[1rem]
            font-bold
            leading-[1.22]
            text-deep
            transition-colors
            hover:text-[hsl(var(--color-article-accent))]
          "
        >
          {story.headline}
        </Link>
      </div>
    </article>
  );
}