import type { Locale } from '@/types';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  PublicStoryListItem,
  StoryWithRelations,
} from '@/types/editorial';

import { ArticleActions } from './ArticleActions';
import { ArticleBody } from './ArticleBody';
import { ArticleHeader } from './ArticleHeader';
import { ArticleRightRail } from './ArticleRightRail';
import { ArticleListenBar } from './ArticleListenBar';
import { ArticleRelatedStories } from './ArticleRelatedStories';

interface ArticleBookmarkState {
  isAuthenticated: boolean;
  initialBookmarked: boolean;
  signInHref: string;
}

interface ArticleViewProps {
  story: StoryWithRelations;
  locale: Locale;
  dict: Dictionary;
  isPreview?: boolean;
  bookmarkState?: ArticleBookmarkState;
  trendingStories?: PublicStoryListItem[];
  relatedStories?: PublicStoryListItem[];
  commentCount?: number;
}

export function ArticleView({
  story,
  locale,
  dict,
  isPreview,
  bookmarkState,
  trendingStories = [],
  relatedStories = [],
  commentCount = 0,
}: ArticleViewProps) {
  return (
    <article className="bg-white">
      {/* ======================================================
          ARTICLE HEADER + FEATURED IMAGE
      ====================================================== */}
      <ArticleHeader
        story={story}
        locale={locale}
        dict={dict}
      />

      {/* ======================================================
          MAIN ARTICLE AREA
      ====================================================== */}
      <div className="container-wide">
        <div
          className="
            mx-auto
            grid
            items-start
            max-w-[1180px]
            gap-8
            py-8
            lg:grid-cols-[52px_minmax(0,42rem)_280px]
            lg:gap-8
            lg:py-10
            xl:grid-cols-[64px_minmax(0,42rem)_320px]
            xl:gap-10
          "
        >
          {/* ==================================================
              LEFT STICKY ACTIONS
          ================================================== */}
          <ArticleActions
            storyId={story.id}
            dict={dict}
            bookmarkState={bookmarkState}
            commentCount={commentCount}
          />

          {/* ==================================================
              ARTICLE BODY
          ================================================== */}
          <main className="min-w-0">
            <ArticleListenBar
              body={story.body}
              locale={locale}
            />

            <ArticleBody
              body={story.body}
            />

            {/* Tags */}
            {story.tags.length > 0 && (
              <section
                className="
                  mt-10
                  border-t
                  border-border
                  pt-6
                "
              >
                <h2 className="eyebrow text-deep">
                  {dict.story.tags}
                </h2>

                <div
                  className="
                    mt-3
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {story.tags.map(
                    (tag) => (
                      <span
                        key={tag.id}
                        className="
                          rounded-full
                          border
                          border-border
                          bg-surface-muted
                          px-3
                          py-1.5
                          font-interface
                          text-[0.7rem]
                          font-medium
                          text-foreground
                        "
                      >
                        {tag.name}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}
          </main>

          {/* ==================================================
              RIGHT RAIL
          ================================================== */}
          <ArticleRightRail
            locale={locale}
            dict={dict}
            trendingStories={
              trendingStories
            }
          />
        </div>
      </div>

      {/* ======================================================
          RELATED STORIES
      ====================================================== */}
      {relatedStories.length > 0 && (
        <ArticleRelatedStories
          stories={relatedStories}
          locale={locale}
          title={
            dict.article.relatedStories
          }
        />
      )}
    </article>
  );
}