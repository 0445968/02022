import type {
  Metadata,
} from 'next';

import {
  notFound,
} from 'next/navigation';

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
   * DEV_AUTH_BYPASS represents a mock editorial
   * identity, not an authenticated reader session.
   *
   * Reader bookmarks therefore remain logged out
   * while the editorial bypass is active. This avoids
   * weakening bookmark RLS with anonymous policies.
   */
  const reader =
    isDevAuthBypass()
      ? null
      : await getCurrentUser();

  let initialBookmarked =
    false;

  if (reader) {
    try {
      initialBookmarked =
        await isStoryBookmarked(
          reader.id,
          story.id
        );
    } catch (error) {
      /*
       * A bookmark lookup failure should not prevent
       * the published article from loading.
       */
      console.error(
        'Unable to load article bookmark state:',
        error
      );
    }
  }

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

  const signInHref =
    `${signInPath}?next=${encodeURIComponent(
      articlePath
    )}`;

  return (
    <ArticleView
      story={story}
      locale={locale}
      dict={dict}
      bookmarkState={{
        isAuthenticated:
          Boolean(reader),

        initialBookmarked,

        signInHref,
      }}
    />
  );
}