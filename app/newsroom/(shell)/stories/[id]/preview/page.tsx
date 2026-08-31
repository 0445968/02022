import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { getStoryForEditing } from '@/lib/services/stories';
import { canViewStory } from '@/lib/permissions/stories';

import { ArticleView } from '@/components/editorial/article-view';

import type { Locale } from '@/types';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PreviewPage({
  params,
}: PageProps) {
  const user =
    await getCurrentUser();

  if (!user) {
    notFound();
  }

  const locale =
    (user.profile?.preferredLocale ??
      defaultLocale) as Locale;

  const dict =
    getDictionary(locale);

  const story =
    await getStoryForEditing(
      params.id
    );

  if (
    !story ||
    !canViewStory(
      user,
      story.author?.id ??
        null
    )
  ) {
    notFound();
  }

  const editorHref =
    `/newsroom/stories/${story.id}/edit`;

  const storiesHref =
    '/newsroom/stories';

  const publicHref =
    `/${story.language}/article/${story.slug}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Preview toolbar */}
      <div
        className="
          sticky
          top-0
          z-50
          border-b
          border-border
          bg-deep
          text-white
        "
      >
        <div
          className="
            flex
            min-h-12
            items-center
            justify-between
            gap-4
            px-4
            sm:px-6
          "
        >
          {/* Left */}
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href={editorHref}
              className="
                inline-flex
                shrink-0
                items-center
                gap-1.5
                text-sm
                font-semibold
                text-white
                transition-opacity
                hover:opacity-75
                focus-visible:outline-none
                focus-visible:underline
              "
            >
              <ArrowLeft
                className="h-4 w-4"
                aria-hidden
              />

              {locale === 'es'
                ? 'Volver al editor'
                : 'Back to editor'}
            </Link>

            <div
              className="
                hidden
                h-5
                w-px
                bg-white/20
                sm:block
              "
              aria-hidden
            />

            <div className="hidden min-w-0 sm:block">
              <p
                className="
                  truncate
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-white/60
                "
              >
                {locale === 'es'
                  ? 'Modo de vista previa'
                  : 'Preview mode'}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="
                hidden
                border
                border-white/20
                px-2
                py-1
                text-[0.6875rem]
                font-semibold
                uppercase
                tracking-wide
                text-white/75
                md:inline-flex
              "
            >
              {story.status.replace(
                '_',
                ' '
              )}
            </span>

            <Link
              href={storiesHref}
              className="
                hidden
                h-8
                items-center
                border
                border-white/20
                px-3
                text-xs
                font-semibold
                text-white
                transition-colors
                hover:bg-white/10
                sm:inline-flex
              "
            >
              {locale === 'es'
                ? 'Todas las historias'
                : 'All stories'}
            </Link>

            {story.status ===
              'published' && (
              <Link
                href={publicHref}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  h-8
                  items-center
                  gap-1.5
                  bg-white
                  px-3
                  text-xs
                  font-semibold
                  text-deep
                  transition-opacity
                  hover:opacity-90
                "
              >
                {locale === 'es'
                  ? 'Ver publicada'
                  : 'View published'}

                <ExternalLink
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Preview notice */}
      {story.status !==
        'published' && (
        <div
          className="
            border-b
            border-highlight/40
            bg-highlight
            px-4
            py-2
            text-center
            text-xs
            font-semibold
            text-deep
          "
        >
          {locale === 'es'
            ? `Esta es una vista previa interna. La historia todavía no está publicada. Estado: ${story.status.replace('_', ' ')}.`
            : `This is an internal preview. The story is not currently published. Status: ${story.status.replace('_', ' ')}.`}
        </div>
      )}

      <ArticleView
        story={story}
        locale={locale}
        dict={dict}
        isPreview
      />
    </div>
  );
}