'use client';

import {
  ArrowLeft,
  ExternalLink,
  X,
} from 'lucide-react';

import Image from 'next/image';

import type { Locale } from '@/types';

import type {
  BreakingNewsItem,
  HomepagePlacement,
} from '@/lib/services/front-page';

interface FrontPagePreviewProps {
  locale: Locale;
  placements: HomepagePlacement[];
  breakingNews: BreakingNewsItem[];
  onClose: () => void;
}

function getPlacement(
  placements: HomepagePlacement[],
  slot: HomepagePlacement['slot'],
  position = 0
) {
  return (
    placements.find(
      (placement) =>
        placement.slot === slot &&
        placement.position ===
          position
    ) ?? null
  );
}

function StoryImage({
  placement,
  className = '',
}: {
  placement: HomepagePlacement | null;
  className?: string;
}) {
  if (
    !placement?.story
      .featuredImage
  ) {
    return (
      <div
        className={`
          flex
          items-center
          justify-center
          bg-surface-muted
          text-xs
          font-semibold
          uppercase
          tracking-[0.14em]
          text-muted-foreground
          ${className}
        `}
      >
        No image
      </div>
    );
  }

  return (
    <div
      className={`
        relative
        overflow-hidden
        bg-surface-muted
        ${className}
      `}
    >
      <Image
        src={
          placement.story
            .featuredImage.url
        }
        alt={
          placement.story
            .featuredImage
            .altText ||
          placement.story
            .headline
        }
        fill
        className="object-cover"
        sizes="100vw"
      />
    </div>
  );
}

function StoryCard({
  placement,
  locale,
  size = 'medium',
}: {
  placement: HomepagePlacement | null;
  locale: Locale;
  size?:
    | 'lead'
    | 'medium'
    | 'small';
}) {
  if (!placement) {
    return (
      <div
        className="
          flex
          min-h-[180px]
          items-center
          justify-center
          border
          border-dashed
          border-border
          bg-surface-muted/40
          px-4
          text-center
          text-xs
          font-semibold
          text-muted-foreground
        "
      >
        {locale === 'es'
          ? 'Sin historia asignada'
          : 'No story assigned'}
      </div>
    );
  }

  const category =
    placement.story
      .primaryCategory;

  const categoryLabel =
    category
      ? locale === 'es'
        ? category.nameEs
        : category.nameEn
      : null;

  return (
    <article>
      <StoryImage
        placement={placement}
        className={
          size === 'lead'
            ? 'aspect-[16/9]'
            : size ===
                'medium'
              ? 'aspect-[4/3]'
              : 'aspect-[16/10]'
        }
      />

      <div className="pt-3">
        {categoryLabel && (
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-primary
            "
          >
            {
              categoryLabel
            }
          </p>
        )}

        <h3
          className={`
            mt-1
            font-headline
            font-bold
            leading-tight
            text-deep

            ${
              size === 'lead'
                ? 'text-3xl lg:text-5xl'
                : size ===
                    'medium'
                  ? 'text-xl lg:text-2xl'
                  : 'text-base lg:text-lg'
            }
          `}
        >
          {
            placement.story
              .headline
          }
        </h3>
      </div>
    </article>
  );
}

export function FrontPagePreview({
  locale,
  placements,
  breakingNews,
  onClose,
}: FrontPagePreviewProps) {
  const lead =
    getPlacement(
      placements,
      'lead'
    );

  const topLeft =
    getPlacement(
      placements,
      'top_left'
    );

  const topRight =
    getPlacement(
      placements,
      'top_right'
    );

  const secondary =
    [0, 1, 2].map(
      (position) =>
        getPlacement(
          placements,
          'secondary',
          position
        )
    );

  const editorsPicks =
    [0, 1, 2].map(
      (position) =>
        getPlacement(
          placements,
          'editors_pick',
          position
        )
    );

  const latestFeature =
    getPlacement(
      placements,
      'latest_feature'
    );

  const videoFeature =
    getPlacement(
      placements,
      'video_feature'
    );

  const sectionFeatures =
    placements
      .filter(
        (placement) =>
          placement.slot ===
          'section_feature'
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  const activeBreaking =
    breakingNews
      .filter(
        (item) =>
          item.active
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        overflow-y-auto
        bg-white
      "
    >
      {/* Preview toolbar */}
      <div
        className="
          sticky
          top-0
          z-40
          border-b
          border-border
          bg-white/95
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            flex
            h-14
            max-w-[1500px]
            items-center
            justify-between
            gap-4
            px-4
            sm:px-6
            lg:px-8
          "
        >
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              inline-flex
              items-center
              gap-2
              rounded-lg
              px-3
              py-2
              text-sm
              font-semibold
              text-deep
              transition-colors
              hover:bg-surface-muted
            "
          >
            <ArrowLeft
              className="h-4 w-4"
            />

            {locale === 'es'
              ? 'Volver al editor'
              : 'Back to editor'}
          </button>

          <div
            className="
              text-center
            "
          >
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Vista previa'
                : 'Preview'}
            </p>

            <p
              className="
                text-sm
                font-semibold
                text-deep
              "
            >
              West Island Times
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-border
              bg-white
              text-deep
              transition-colors
              hover:bg-surface-muted
            "
            aria-label={
              locale === 'es'
                ? 'Cerrar vista previa'
                : 'Close preview'
            }
          >
            <X
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>

      {/* Site preview */}
      <div
        className="
          mx-auto
          min-h-screen
          max-w-[1500px]
          bg-white
        "
      >
        <header
          className="
            border-b
            border-deep
            px-5
            py-7
            sm:px-8
            lg:px-10
          "
        >
          <div
            className="
              flex
              items-end
              justify-between
              gap-6
            "
          >
            <div>
              <div
                className="
                  text-3xl
                  font-black
                  tracking-[-0.05em]
                  text-deep
                  sm:text-4xl
                  lg:text-5xl
                "
              >
                West Island Times
              </div>

              <p
                className="
                  mt-2
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-muted-foreground
                "
              >
                San Andrés · Old Providence · Saint Catalina
              </p>
            </div>

            <div
              className="
                hidden
                items-center
                gap-5
                text-xs
                font-semibold
                text-deep
                lg:flex
              "
            >
              <span>
                Latest
              </span>

              <span>
                News
              </span>

              <span>
                Raizal
              </span>

              <span>
                Environment
              </span>

              <span>
                Culture
              </span>

              <span>
                Watch
              </span>

              <span>
                Listen
              </span>
            </div>
          </div>
        </header>

        {activeBreaking.length >
          0 && (
          <div
            className="
              flex
              items-center
              gap-4
              bg-breaking
              px-5
              py-3
              text-white
              sm:px-8
              lg:px-10
            "
          >
            <span
              className="
                shrink-0
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
              "
            >
              {locale === 'es'
                ? 'Última hora'
                : 'Breaking'}
            </span>

            <span
              className="
                truncate
                text-sm
                font-semibold
              "
            >
              {
                activeBreaking[0]
                  .headline
              }
            </span>

            {activeBreaking[0]
              .externalUrl && (
              <ExternalLink
                className="
                  ml-auto
                  h-4
                  w-4
                  shrink-0
                "
              />
            )}
          </div>
        )}

        <main
          className="
            space-y-12
            px-5
            py-8
            sm:px-8
            lg:px-10
            lg:py-10
          "
        >
          <section
            className="
              grid
              gap-8
              lg:grid-cols-12
            "
          >
            <div className="lg:col-span-7">
              <StoryCard
                placement={lead}
                locale={locale}
                size="lead"
              />
            </div>

            <div
              className="
                grid
                gap-7
                sm:grid-cols-2
                lg:col-span-5
                lg:grid-cols-1
              "
            >
              <StoryCard
                placement={
                  topLeft
                }
                locale={
                  locale
                }
                size="medium"
              />

              <StoryCard
                placement={
                  topRight
                }
                locale={
                  locale
                }
                size="medium"
              />
            </div>
          </section>

          <section
            className="
              border-t
              border-deep
              pt-6
            "
          >
            <div
              className="
                grid
                gap-6
                md:grid-cols-3
              "
            >
              {secondary.map(
                (
                  placement,
                  index
                ) => (
                  <StoryCard
                    key={
                      index
                    }
                    placement={
                      placement
                    }
                    locale={
                      locale
                    }
                    size="small"
                  />
                )
              )}
            </div>
          </section>

          <section>
            <div
              className="
                mb-5
                border-b
                border-deep
                pb-3
              "
            >
              <h2
                className="
                  font-headline
                  text-2xl
                  font-bold
                  text-deep
                "
              >
                {locale === 'es'
                  ? 'Selección editorial'
                  : "Editors' Picks"}
              </h2>
            </div>

            <div
              className="
                grid
                gap-6
                md:grid-cols-3
              "
            >
              {editorsPicks.map(
                (
                  placement,
                  index
                ) => (
                  <StoryCard
                    key={
                      index
                    }
                    placement={
                      placement
                    }
                    locale={
                      locale
                    }
                    size="small"
                  />
                )
              )}
            </div>
          </section>

          <section
            className="
              grid
              gap-8
              border-t
              border-deep
              pt-6
              lg:grid-cols-2
            "
          >
            <div>
              <p
                className="
                  mb-4
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-primary
                "
              >
                {locale === 'es'
                  ? 'Destacado reciente'
                  : 'Latest Feature'}
              </p>

              <StoryCard
                placement={
                  latestFeature
                }
                locale={
                  locale
                }
                size="medium"
              />
            </div>

            <div>
              <p
                className="
                  mb-4
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-breaking
                "
              >
                {locale === 'es'
                  ? 'Video'
                  : 'Watch'}
              </p>

              <StoryCard
                placement={
                  videoFeature
                }
                locale={
                  locale
                }
                size="medium"
              />
            </div>
          </section>

          {sectionFeatures.length >
            0 && (
            <section
              className="
                border-t
                border-deep
                pt-6
              "
            >
              <div
                className="
                  mb-5
                  border-b
                  border-deep
                  pb-3
                "
              >
                <h2
                  className="
                    font-headline
                    text-2xl
                    font-bold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'Secciones'
                    : 'Sections'}
                </h2>
              </div>

              <div
                className="
                  grid
                  gap-6
                  md:grid-cols-2
                  xl:grid-cols-3
                "
              >
                {sectionFeatures.map(
                  (
                    placement
                  ) => (
                    <StoryCard
                      key={
                        placement.id
                      }
                      placement={
                        placement
                      }
                      locale={
                        locale
                      }
                      size="small"
                    />
                  )
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}