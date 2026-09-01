import Link from 'next/link';
import {
  notFound,
} from 'next/navigation';

import {
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
  defaultLocale,
} from '@/lib/i18n/config';

import {
  getStoryForEditing,
} from '@/lib/services/stories';

import {
  buildRevisionPreviewStory,
} from '@/lib/services/story-revision-preview';

import {
  buildStoryVersionPreview,
} from '@/lib/services/story-version-preview';

import {
  canViewStory,
} from '@/lib/permissions/stories';

import {
  ArticleView,
} from '@/components/editorial/article-view';

import {
  StoryRevisionComparison,
} from '@/components/editorial/story-editor/StoryRevisionComparison';

import {
  StoryVersionComparison,
} from '@/components/editorial/story-editor/StoryVersionComparison';

import type {
  Locale,
} from '@/types';

interface PageProps {
  params: {
    id: string;
  };

  searchParams?: {
    revision?:
      | string
      | string[];

    version?:
      | string
      | string[];

    view?:
      | string
      | string[];
  };
}

export default async function PreviewPage({
  params,
  searchParams,
}: PageProps) {
  const user =
    await getCurrentUser();

  if (!user) {
    notFound();
  }

  const locale =
    (
      user.profile
        ?.preferredLocale ??
      defaultLocale
    ) as Locale;

  const dict =
    getDictionary(
      locale
    );

  // ==================================================
  // Published / current story
  // ==================================================

  const liveStory =
    await getStoryForEditing(
      params.id
    );

  if (
    !liveStory ||
    !canViewStory(
      user,
      liveStory.author
        ?.id ??
        null
    )
  ) {
    notFound();
  }

  // ==================================================
  // Query parameters
  // ==================================================

  const revisionParam =
    Array.isArray(
      searchParams
        ?.revision
    )
      ? searchParams
          ?.revision[0]
      : searchParams
          ?.revision;

  const versionParam =
    Array.isArray(
      searchParams
        ?.version
    )
      ? searchParams
          ?.version[0]
      : searchParams
          ?.version;

  const viewParam =
    Array.isArray(
      searchParams
        ?.view
    )
      ? searchParams
          ?.view[0]
      : searchParams
          ?.view;

  const wantsRevision =
    revisionParam ===
    '1';

  const wantsChanges =
    viewParam ===
    'changes';

  const wantsHistoricalComparison =
    Boolean(
      versionParam
    ) &&
    wantsChanges;

  // ==================================================
  // Historical version comparison
  // ==================================================
  //
  // Historical versions do not get their own full
  // preview mode.
  //
  // The eye button in Version History already provides
  // the historical popup preview inside the editor.
  //
  // This full page is used only when the user chooses
  // "Compare to live".
  // ==================================================

  const historicalStory =
    wantsHistoricalComparison &&
    versionParam
      ? await buildStoryVersionPreview({
          story:
            liveStory,

          versionId:
            versionParam,
        })
      : null;

  /**
   * If a historical comparison was explicitly requested
   * but that version does not exist or does not belong to
   * this story, return 404 rather than silently showing
   * the current article.
   */
  if (
    wantsHistoricalComparison &&
    !historicalStory
  ) {
    notFound();
  }

  const isHistoricalComparison =
    Boolean(
      historicalStory
    );

  // ==================================================
  // Revision preview
  // ==================================================
  //
  // Historical comparison takes precedence. We should
  // never accidentally load an unpublished revision into
  // a historical-version comparison.
  // ==================================================

  let revisionStory:
    | typeof liveStory
    | null =
    null;

  if (
    !isHistoricalComparison &&
    wantsRevision &&
    liveStory.status ===
      'published'
  ) {
    revisionStory =
      await buildRevisionPreviewStory(
        {
          story:
            liveStory,
        }
      );
  }

  const isRevisionPreview =
    Boolean(
      revisionStory
    );

  /**
   * Normal Preview mode shows the unpublished revision
   * when one exists, otherwise the current story.
   */
  const previewStory =
    revisionStory ??
    liveStory;

  /**
   * Revision Changes mode only makes sense when an
   * unpublished revision actually exists.
   */
  const showRevisionChanges =
    !isHistoricalComparison &&
    wantsChanges &&
    Boolean(
      revisionStory
    );

  // ==================================================
  // Links
  // ==================================================

  const editorHref =
    `/newsroom/stories/${liveStory.id}/edit`;

  const storiesHref =
    '/newsroom/stories';

  /**
   * Always point at the currently published article.
   *
   * An unpublished revision or old historical version
   * may contain content that is not currently live.
   */
  const publicHref =
    `/${liveStory.language}/article/${liveStory.slug}`;

  const previewHref =
    isRevisionPreview
      ? `/newsroom/stories/${liveStory.id}/preview?revision=1&view=preview`
      : `/newsroom/stories/${liveStory.id}/preview`;

  const changesHref =
    `/newsroom/stories/${liveStory.id}/preview?revision=1&view=changes`;

  // ==================================================
  // Toolbar labels
  // ==================================================

  const toolbarModeLabel =
    isHistoricalComparison
      ? locale ===
        'es'
        ? 'Comparar con publicada'
        : 'Compare to live'
      : showRevisionChanges
        ? locale ===
          'es'
          ? 'Comparar cambios'
          : 'Compare changes'
        : isRevisionPreview
          ? locale ===
            'es'
            ? 'Vista previa de revisión'
            : 'Revision preview'
          : locale ===
            'es'
            ? 'Modo de vista previa'
            : 'Preview mode';

  return (
    <div className="min-h-screen bg-white">
      {/* ==================================================
          Preview toolbar
      ================================================== */}

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

          <div
            className="
              flex
              min-w-0
              items-center
              gap-4
            "
          >
            <Link
              href={
                editorHref
              }
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

              {locale ===
              'es'
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

            <p
              className="
                hidden
                truncate
                text-xs
                font-semibold
                uppercase
                tracking-[0.12em]
                text-white/60
                sm:block
              "
            >
              {
                toolbarModeLabel
              }
            </p>
          </div>

          {/* Right */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            {/* ==========================================
                Revision Preview / Changes switch
            ========================================== */}

            {isRevisionPreview &&
              !isHistoricalComparison && (
                <div
                  className="
                    hidden
                    items-center
                    rounded-lg
                    border
                    border-white/20
                    bg-white/5
                    p-0.5
                    sm:flex
                  "
                >
                  <Link
                    href={
                      previewHref
                    }
                    className={`
                      inline-flex
                      h-7
                      items-center
                      rounded-md
                      px-3
                      text-xs
                      font-semibold
                      transition-colors
                      ${
                        !showRevisionChanges
                          ? 'bg-white text-deep'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    {locale ===
                    'es'
                      ? 'Vista previa'
                      : 'Preview'}
                  </Link>

                  <Link
                    href={
                      changesHref
                    }
                    className={`
                      inline-flex
                      h-7
                      items-center
                      rounded-md
                      px-3
                      text-xs
                      font-semibold
                      transition-colors
                      ${
                        showRevisionChanges
                          ? 'bg-star text-deep'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    {locale ===
                    'es'
                      ? 'Cambios'
                      : 'Changes'}
                  </Link>
                </div>
              )}

            {/* ==========================================
                Historical version indicator
            ========================================== */}

            {isHistoricalComparison && (
              <span
                className="
                  hidden
                  items-center
                  rounded-lg
                  border
                  border-star/40
                  bg-star/10
                  px-2.5
                  py-1
                  text-[0.6875rem]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-star
                  md:inline-flex
                "
              >
                {locale ===
                'es'
                  ? 'Versión histórica'
                  : 'Historical version'}
              </span>
            )}

            {/* ==========================================
                Revision indicator
            ========================================== */}

            {isRevisionPreview &&
              !isHistoricalComparison && (
                <span
                  className="
                    hidden
                    items-center
                    rounded-lg
                    border
                    border-star/40
                    bg-star/10
                    px-2.5
                    py-1
                    text-[0.6875rem]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-star
                    lg:inline-flex
                  "
                >
                  {locale ===
                  'es'
                    ? 'Sin publicar'
                    : 'Unpublished'}
                </span>
              )}

            {/* ==========================================
                Standard status
            ========================================== */}

            {!isRevisionPreview &&
              !isHistoricalComparison && (
                <span
                  className="
                    hidden
                    rounded-lg
                    border
                    border-white/20
                    px-2
                    py-1
                    text-[0.6875rem]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-white/75
                    lg:inline-flex
                  "
                >
                  {liveStory.status.replace(
                    '_',
                    ' '
                  )}
                </span>
              )}

            {/* All stories */}

            <Link
              href={
                storiesHref
              }
              className="
                hidden
                h-8
                items-center
                rounded-lg
                border
                border-white/20
                px-3
                text-xs
                font-semibold
                text-white
                transition-colors
                hover:bg-white/10
                md:inline-flex
              "
            >
              {locale ===
              'es'
                ? 'Todas las historias'
                : 'All stories'}
            </Link>

            {/* Live article */}

            {liveStory.status ===
              'published' && (
              <Link
                href={
                  publicHref
                }
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  h-8
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-white
                  px-3
                  text-xs
                  font-semibold
                  text-deep
                  transition-opacity
                  hover:opacity-90
                "
              >
                {locale ===
                'es'
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

        {/* ==============================================
            Mobile Revision Preview / Changes switch
        ============================================== */}

        {isRevisionPreview &&
          !isHistoricalComparison && (
            <div
              className="
                flex
                border-t
                border-white/10
                px-4
                py-2
                sm:hidden
              "
            >
              <div
                className="
                  grid
                  w-full
                  grid-cols-2
                  rounded-lg
                  border
                  border-white/20
                  bg-white/5
                  p-0.5
                "
              >
                <Link
                  href={
                    previewHref
                  }
                  className={`
                    inline-flex
                    h-8
                    items-center
                    justify-center
                    rounded-md
                    text-xs
                    font-semibold
                    ${
                      !showRevisionChanges
                        ? 'bg-white text-deep'
                        : 'text-white/75'
                    }
                  `}
                >
                  {locale ===
                  'es'
                    ? 'Vista previa'
                    : 'Preview'}
                </Link>

                <Link
                  href={
                    changesHref
                  }
                  className={`
                    inline-flex
                    h-8
                    items-center
                    justify-center
                    rounded-md
                    text-xs
                    font-semibold
                    ${
                      showRevisionChanges
                        ? 'bg-star text-deep'
                        : 'text-white/75'
                    }
                  `}
                >
                  {locale ===
                  'es'
                    ? 'Cambios'
                    : 'Changes'}
                </Link>
              </div>
            </div>
          )}
      </div>

      {/* ==================================================
          Historical comparison notice
      ================================================== */}

      {isHistoricalComparison && (
        <div
          className="
            border-b
            border-star/30
            bg-star/10
            px-4
            py-2.5
            text-center
            text-xs
            font-semibold
            text-deep
          "
        >
          {locale ===
          'es'
            ? 'Estás comparando una versión histórica guardada con el artículo publicado actualmente. Nada se modificará hasta que restaures la versión y publiques los cambios.'
            : 'You are comparing a saved historical version with the currently published article. Nothing will change until you restore the version and publish the update.'}
        </div>
      )}

      {/* ==================================================
          Revision notice
      ================================================== */}

      {isRevisionPreview &&
        !showRevisionChanges &&
        !isHistoricalComparison && (
          <div
            className="
              border-b
              border-star/30
              bg-star/10
              px-4
              py-2.5
              text-center
              text-xs
              font-semibold
              text-deep
            "
          >
            {locale ===
            'es'
              ? 'Esta vista previa muestra cambios sin publicar. La versión actualmente publicada permanece sin cambios.'
              : 'This preview shows unpublished changes. The currently published version remains unchanged.'}
          </div>
        )}

      {/* ==================================================
          Standard unpublished story notice
      ================================================== */}

      {!isRevisionPreview &&
        !isHistoricalComparison &&
        liveStory.status !==
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
            {locale ===
            'es'
              ? `Esta es una vista previa interna. La historia todavía no está publicada. Estado: ${liveStory.status.replace('_', ' ')}.`
              : `This is an internal preview. The story is not currently published. Status: ${liveStory.status.replace('_', ' ')}.`}
          </div>
        )}

      {/* ==================================================
          Historical version vs live comparison
      ================================================== */}

      {isHistoricalComparison &&
      historicalStory ? (
        <StoryVersionComparison
          liveStory={
            liveStory
          }
          historicalStory={
            historicalStory
          }
          locale={
            locale
          }
          versionCreatedAt={
            historicalStory.updatedAt
          }
        />
      ) : showRevisionChanges &&
        revisionStory ? (
        /* ==================================================
           Unpublished revision vs published comparison
        ================================================== */

        <StoryRevisionComparison
          publishedStory={
            liveStory
          }
          revisionStory={
            revisionStory
          }
          locale={
            locale
          }
        />
      ) : (
        /* ==================================================
           Article preview
        ================================================== */

        <ArticleView
          story={
            previewStory
          }
          locale={
            locale
          }
          dict={
            dict
          }
          isPreview
        />
      )}
    </div>
  );
}