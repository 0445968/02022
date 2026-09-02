import type {
  Metadata,
} from 'next';

import {
  notFound,
} from 'next/navigation';

import {
  StoryComments,
} from '@/components/comments/story-comments';

import {
  ArticleView,
} from '@/components/editorial/article-view';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  isDevAuthBypass,
} from '@/lib/db/supabase-data';

import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
  isLocale,
  localizedPath,
} from '@/lib/i18n/config';

import {
  isStoryBookmarked,
} from '@/lib/services/bookmarks';

import {
  getPublicCommentsForStory,
  type PublicCommentThread,
} from '@/lib/services/comments';

import {
  getPublishedStoryBySlug,
} from '@/lib/services/stories';

import type {
  Locale,
} from '@/types';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const locale =
    isLocale(params.locale)
      ? params.locale
      : 'en';

  const story =
    await getPublishedStoryBySlug(
      params.slug
    );

  if (!story) {
    return {
      title:
        'Not found',
    };
  }

  const title =
    story.seoTitle ||
    story.headline;

  const description =
    story.seoDescription ||
    story.summary ||
    '';

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type:
        'article',

      images:
        story.featuredImage
          ? [
              {
                url:
                  story.featuredImage.url,
              },
            ]
          : [],

      publishedTime:
        story.publishedAt ??
        undefined,

      authors:
        story.author?.name
          ? [
              story.author.name,
            ]
          : [],
    },

    alternates: {
      languages: {
        en:
          `/en/article/${story.slug}`,

        es:
          `/es/article/${story.slug}`,
      },
    },
  };
}

export default async function ArticlePage({
  params,
}: PageProps) {
  if (
    !isLocale(params.locale)
  ) {
    notFound();
  }

  const locale =
    params.locale as Locale;

  const dict =
    getDictionary(locale);

  const story =
    await getPublishedStoryBySlug(
      params.slug
    );

  if (!story) {
    return (
      <div className="container-wide py-20 text-center">
        <h1 className="font-headline text-3xl font-bold text-deep">
          {dict.article.notFound}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {
            dict.article
              .notFoundDesc
          }
        </p>
      </div>
    );
  }

  /*
   * The editorial bypass is not a real reader session.
   * Public comments still load, but posting and
   * bookmarking remain signed-out while it is active.
   */
  const reader =
    isDevAuthBypass()
      ? null
      : await getCurrentUser();

  const emptyThread:
    PublicCommentThread = {
      comments: [],
      total: 0,
      hasMore: false,
    };

  const [
    initialBookmarked,
    initialThread,
  ] = await Promise.all([
    reader
      ? isStoryBookmarked(
          reader.id,
          story.id
        ).catch(
          (error) => {
            console.error(
              'Unable to load article bookmark state:',
              error
            );

            return false;
          }
        )
      : false,

    getPublicCommentsForStory(
      story.id,
      {
        limit: 200,
      }
    ).catch(
      (error) => {
        /*
         * A comment outage must not prevent readers
         * from accessing the published article.
         */
        console.error(
          'Unable to load article comments:',
          error
        );

        return emptyThread;
      }
    ),
  ]);

  const articlePath =
    localizedPath(
      locale,
      `/article/${story.slug}`
    );

  const signInPath =
    localizedPath(
      locale,
      '/auth/sign-in'
    );

  const bookmarkSignInHref =
    `${signInPath}?next=${encodeURIComponent(
      articlePath
    )}`;

  const commentSignInHref =
    `${signInPath}?next=${encodeURIComponent(
      `${articlePath}#comments`
    )}`;

  return (
    <>
      <ArticleView
        story={story}
        locale={locale}
        dict={dict}
        bookmarkState={{
          isAuthenticated:
            Boolean(reader),

          initialBookmarked,

          signInHref:
            bookmarkSignInHref,
        }}
      />

      <StoryComments
        storyId={
          story.id
        }
        locale={
          locale
        }
        initialThread={
          initialThread
        }
        isAuthenticated={
          Boolean(reader)
        }
        signInHref={
          commentSignInHref
        }
        labels={{
          heading:
            dict.article
              .comments,

          intro:
            dict.article
              .commentIntro,

          signInPrompt:
            dict.article
              .commentSignInPrompt,

          signInAction:
            dict.article
              .commentSignInAction,

          placeholder:
            dict.article
              .commentPlaceholder,

          submit:
            dict.article
              .commentSubmit,

          submitting:
            dict.article
              .commentSubmitting,

          pendingNotice:
            dict.article
              .commentPendingNotice,

          reply:
            dict.article
              .commentReply,

          replyingTo:
            dict.article
              .commentReplyingTo,

          cancelReply:
            dict.article
              .commentCancelReply,

          emptyTitle:
            dict.article
              .commentEmptyTitle,

          emptyDescription:
            dict.article
              .commentEmptyDescription,

          anonymous:
            dict.article
              .commentAnonymous,

          edited:
            dict.article
              .commentEdited,

          charactersRemaining:
            dict.article
              .commentCharactersRemaining,

          loadMore:
            dict.article
              .commentLoadMore,

          loadError:
            dict.article
              .commentLoadError,

          submitError:
            dict.article
              .commentSubmitError,
        }}
      />
    </>
  );
}