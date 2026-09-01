'use client';

import Image from 'next/image';

import {
  createStoryTextSnapshot,
  diffText,
} from '@/lib/editorial/story-diff';

import type {
  StoryWithRelations,
} from '@/types/editorial';

import {
  islandLabel,
} from '@/types/editorial';

import {
  cn,
} from '@/lib/utils';

interface StoryRevisionComparisonProps {
  publishedStory:
    StoryWithRelations;

  revisionStory:
    StoryWithRelations;

  locale:
    'en' | 'es';
}

interface DiffFieldProps {
  label: string;

  publishedValue: string;

  revisionValue: string;

  multiline?: boolean;
}

interface MetadataFieldProps {
  label: string;

  publishedValue:
    string;

  revisionValue:
    string;
}

/* =========================================================
   TEXT DIFF
========================================================= */

function DiffText({
  original,
  revised,
  side,
}: {
  original: string;

  revised: string;

  side:
    | 'published'
    | 'revision';
}) {
  const parts =
    diffText(
      original,
      revised
    );

  return (
    <div
      className="
        whitespace-pre-wrap
        break-words
      "
    >
      {parts.map(
        (
          part,
          index
        ) => {
          const visible =
            side ===
            'published'
              ? part.type !==
                'added'
              : part.type !==
                'removed';

          if (!visible) {
            return null;
          }

          return (
            <span
              key={`${part.type}-${index}`}
              className={cn(
                part.type ===
                  'removed' &&
                  side ===
                    'published' &&
                  `
                    rounded-sm
                    bg-breaking/10
                    px-0.5
                    text-breaking
                    line-through
                    decoration-breaking/70
                    decoration-1
                  `,

                part.type ===
                  'added' &&
                  side ===
                    'revision' &&
                  `
                    rounded-sm
                    bg-green-100
                    px-0.5
                    text-green-900
                  `
              )}
            >
              {part.value}
            </span>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   ARTICLE FIELD
========================================================= */

function DiffField({
  label,
  publishedValue,
  revisionValue,
  multiline = false,
}: DiffFieldProps) {
  const changed =
    publishedValue !==
    revisionValue;

  return (
    <section
      className="
        border-b
        border-border
        py-5
        last:border-b-0
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <p
          className="
            text-[0.6875rem]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-muted-foreground
          "
        >
          {label}
        </p>

        {changed && (
          <span
            className="
              rounded-md
              bg-star/10
              px-2
              py-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-star
            "
          >
            Changed
          </span>
        )}
      </div>

      <div
        className={cn(
          multiline
            ? `
              font-body
              text-sm
              leading-7
            `
            : `
              font-headline
              text-lg
              leading-snug
            `
        )}
      >
        {changed ? (
          <DiffText
            original={
              publishedValue
            }
            revised={
              revisionValue
            }
            side="published"
          />
        ) : (
          publishedValue || (
            <span className="text-muted-foreground">
              —
            </span>
          )
        )}
      </div>
    </section>
  );
}

function RevisionDiffField({
  label,
  publishedValue,
  revisionValue,
  multiline = false,
}: DiffFieldProps) {
  const changed =
    publishedValue !==
    revisionValue;

  return (
    <section
      className="
        border-b
        border-border
        py-5
        last:border-b-0
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <p
          className="
            text-[0.6875rem]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-muted-foreground
          "
        >
          {label}
        </p>

        {changed && (
          <span
            className="
              rounded-md
              bg-star/10
              px-2
              py-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-star
            "
          >
            Changed
          </span>
        )}
      </div>

      <div
        className={cn(
          multiline
            ? `
              font-body
              text-sm
              leading-7
            `
            : `
              font-headline
              text-lg
              leading-snug
            `
        )}
      >
        {changed ? (
          <DiffText
            original={
              publishedValue
            }
            revised={
              revisionValue
            }
            side="revision"
          />
        ) : (
          revisionValue || (
            <span className="text-muted-foreground">
              —
            </span>
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   METADATA
========================================================= */

function MetadataField({
  label,
  publishedValue,
  revisionValue,
}: MetadataFieldProps) {
  const changed =
    publishedValue !==
    revisionValue;

  return (
    <div
      className="
        border-b
        border-border
        py-4
        last:border-b-0
      "
    >
      <div
        className="
          mb-2
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <p
          className="
            text-[0.6875rem]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-muted-foreground
          "
        >
          {label}
        </p>

        {changed && (
          <span
            className="
              rounded-md
              bg-star/10
              px-2
              py-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-star
            "
          >
            Changed
          </span>
        )}
      </div>

      <div
        className="
          grid
          gap-3
          md:grid-cols-2
        "
      >
        <div
          className={cn(
            `
              rounded-lg
              border
              border-border
              px-3
              py-2.5
              text-sm
            `,
            changed &&
              `
                border-breaking/20
                bg-breaking/5
                text-breaking
              `
          )}
        >
          <p
            className="
              mb-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-muted-foreground
            "
          >
            Published
          </p>

          <p
            className={cn(
              changed &&
                'line-through decoration-breaking/60'
            )}
          >
            {publishedValue ||
              '—'}
          </p>
        </div>

        <div
          className={cn(
            `
              rounded-lg
              border
              border-border
              px-3
              py-2.5
              text-sm
            `,
            changed &&
              `
                border-green-200
                bg-green-50
                text-green-900
              `
          )}
        >
          <p
            className="
              mb-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-muted-foreground
            "
          >
            Revision
          </p>

          <p>
            {revisionValue ||
              '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FEATURED IMAGE
========================================================= */

function FeaturedImageComparison({
  publishedStory,
  revisionStory,
}: {
  publishedStory:
    StoryWithRelations;

  revisionStory:
    StoryWithRelations;
}) {
  const publishedImage =
    publishedStory.featuredImage;

  const revisionImage =
    revisionStory.featuredImage;

  const changed =
    publishedImage?.id !==
    revisionImage?.id;

  return (
    <section
      className="
        border-b
        border-border
        py-5
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <p
          className="
            text-[0.6875rem]
            font-semibold
            uppercase
            tracking-[0.12em]
            text-muted-foreground
          "
        >
          Featured image
        </p>

        {changed && (
          <span
            className="
              rounded-md
              bg-star/10
              px-2
              py-1
              text-[0.625rem]
              font-semibold
              uppercase
              tracking-wide
              text-star
            "
          >
            Changed
          </span>
        )}
      </div>

      <div
        className="
          grid
          gap-4
          md:grid-cols-2
        "
      >
        <ImagePreview
          label="Published"
          image={
            publishedImage
          }
          removed={
            changed &&
            Boolean(
              publishedImage
            )
          }
        />

        <ImagePreview
          label="Revision"
          image={
            revisionImage
          }
          added={
            changed &&
            Boolean(
              revisionImage
            )
          }
        />
      </div>
    </section>
  );
}

function ImagePreview({
  label,
  image,
  removed = false,
  added = false,
}: {
  label: string;

  image:
    StoryWithRelations[
      'featuredImage'
    ];

  removed?: boolean;

  added?: boolean;
}) {
  return (
    <div
      className={cn(
        `
          overflow-hidden
          rounded-lg
          border
          border-border
        `,
        removed &&
          'border-breaking/30 bg-breaking/5',

        added &&
          'border-green-200 bg-green-50'
      )}
    >
      <div
        className="
          border-b
          border-border
          px-3
          py-2
        "
      >
        <p
          className="
            text-[0.625rem]
            font-semibold
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          {label}
        </p>
      </div>

      {image ? (
        <>
          <div
            className="
              relative
              aspect-[16/9]
              w-full
              overflow-hidden
              bg-surface-muted
            "
          >
            <Image
              src={
                image.url
              }
              alt={
                image.altText ||
                ''
              }
              fill
              className={cn(
                'object-cover',
                removed &&
                  'opacity-70'
              )}
              sizes="
                (max-width: 768px) 100vw,
                50vw
              "
            />

            {removed && (
              <div
                className="
                  absolute
                  inset-0
                  bg-breaking/10
                "
              />
            )}

            {added && (
              <div
                className="
                  absolute
                  inset-0
                  ring-4
                  ring-inset
                  ring-green-200
                "
              />
            )}
          </div>

          <div
            className="
              px-3
              py-2
              text-xs
              text-muted-foreground
            "
          >
            {image.fileName}
          </div>
        </>
      ) : (
        <div
          className="
            flex
            aspect-[16/9]
            items-center
            justify-center
            bg-surface-muted
            px-4
            text-sm
            text-muted-foreground
          "
        >
          No featured image
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function joinCategories(
  story:
    StoryWithRelations,
  locale:
    'en' | 'es'
) {
  return story.categories
    .map(
      (category) =>
        locale ===
        'es'
          ? category.nameEs
          : category.nameEn
    )
    .join(', ');
}

function joinTags(
  story:
    StoryWithRelations
) {
  return story.tags
    .map(
      (tag) =>
        tag.name
    )
    .join(', ');
}

function formatDate(
  value:
    string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

/* =========================================================
   ROOT
========================================================= */

export function StoryRevisionComparison({
  publishedStory,
  revisionStory,
  locale,
}: StoryRevisionComparisonProps) {
  const published =
    createStoryTextSnapshot(
      publishedStory
    );

  const revision =
    createStoryTextSnapshot(
      revisionStory
    );

  const labels =
    locale === 'es'
      ? {
          published:
            'Versión publicada',

          revision:
            'Cambios sin publicar',

          headline:
            'Titular',

          subheadline:
            'Subtítulo',

          summary:
            'Resumen',

          body:
            'Cuerpo',

          article:
            'Contenido del artículo',

          metadata:
            'Metadatos y publicación',

          removed:
            'Eliminado',

          added:
            'Añadido',

          changed:
            'Modificado',
        }
      : {
          published:
            'Published version',

          revision:
            'Unpublished changes',

          headline:
            'Headline',

          subheadline:
            'Subheadline',

          summary:
            'Summary',

          body:
            'Body',

          article:
            'Article content',

          metadata:
            'Metadata & publishing',

          removed:
            'Removed',

          added:
            'Added',

          changed:
            'Changed',
        };

  return (
    <div className="bg-white">
      {/* ==================================================
          Legend
      ================================================== */}

      <div
        className="
          border-b
          border-border
          bg-surface-muted
          px-4
          py-3
          sm:px-6
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-[1500px]
            flex-wrap
            items-center
            gap-x-5
            gap-y-2
          "
        >
          <span
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.12em]
              text-muted-foreground
            "
          >
            {labels.changed}
          </span>

          <span
            className="
              inline-flex
              items-center
              gap-2
              text-xs
              text-muted-foreground
            "
          >
            <span
              className="
                inline-block
                h-4
                w-7
                rounded-sm
                bg-breaking/10
              "
            />

            {labels.removed}
          </span>

          <span
            className="
              inline-flex
              items-center
              gap-2
              text-xs
              text-muted-foreground
            "
          >
            <span
              className="
                inline-block
                h-4
                w-7
                rounded-sm
                bg-green-100
              "
            />

            {labels.added}
          </span>
        </div>
      </div>

      {/* ==================================================
          Content diff
      ================================================== */}

      <div
        className="
          mx-auto
          max-w-[1500px]
          border-b
          border-border
        "
      >
        <div
          className="
            px-5
            pt-7
            sm:px-8
            lg:px-10
          "
        >
          <h2
            className="
              font-headline
              text-2xl
              font-semibold
              text-deep
            "
          >
            {labels.article}
          </h2>
        </div>

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-2
          "
        >
          {/* Published */}

          <section
            className="
              min-w-0
              border-b
              border-border
              px-5
              py-6
              sm:px-8
              lg:border-b-0
              lg:border-r
              lg:px-10
            "
          >
            <div
              className="
                sticky
                top-12
                z-10
                -mx-5
                mb-3
                border-b
                border-border
                bg-white/95
                px-5
                py-3
                backdrop-blur
                sm:-mx-8
                sm:px-8
                lg:-mx-10
                lg:px-10
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-deep
                "
              >
                {labels.published}
              </p>
            </div>

            <DiffField
              label={
                labels.headline
              }
              publishedValue={
                published.headline
              }
              revisionValue={
                revision.headline
              }
            />

            <DiffField
              label={
                labels.subheadline
              }
              publishedValue={
                published.subheadline
              }
              revisionValue={
                revision.subheadline
              }
            />

            <DiffField
              label={
                labels.summary
              }
              publishedValue={
                published.summary
              }
              revisionValue={
                revision.summary
              }
              multiline
            />

            <DiffField
              label={
                labels.body
              }
              publishedValue={
                published.body
              }
              revisionValue={
                revision.body
              }
              multiline
            />
          </section>

          {/* Revision */}

          <section
            className="
              min-w-0
              px-5
              py-6
              sm:px-8
              lg:px-10
            "
          >
            <div
              className="
                sticky
                top-12
                z-10
                -mx-5
                mb-3
                border-b
                border-star/30
                bg-star/5
                px-5
                py-3
                backdrop-blur
                sm:-mx-8
                sm:px-8
                lg:-mx-10
                lg:px-10
              "
            >
              <p
                className="
                  text-sm
                  font-semibold
                  text-star
                "
              >
                {labels.revision}
              </p>
            </div>

            <RevisionDiffField
              label={
                labels.headline
              }
              publishedValue={
                published.headline
              }
              revisionValue={
                revision.headline
              }
            />

            <RevisionDiffField
              label={
                labels.subheadline
              }
              publishedValue={
                published.subheadline
              }
              revisionValue={
                revision.subheadline
              }
            />

            <RevisionDiffField
              label={
                labels.summary
              }
              publishedValue={
                published.summary
              }
              revisionValue={
                revision.summary
              }
              multiline
            />

            <RevisionDiffField
              label={
                labels.body
              }
              publishedValue={
                published.body
              }
              revisionValue={
                revision.body
              }
              multiline
            />
          </section>
        </div>
      </div>

      {/* ==================================================
          Metadata diff
      ================================================== */}

      <div
        className="
          mx-auto
          max-w-[1500px]
          px-5
          py-8
          sm:px-8
          lg:px-10
        "
      >
        <h2
          className="
            mb-5
            font-headline
            text-2xl
            font-semibold
            text-deep
          "
        >
          {labels.metadata}
        </h2>

        <FeaturedImageComparison
          publishedStory={
            publishedStory
          }
          revisionStory={
            revisionStory
          }
        />

        <MetadataField
          label="Image description"
          publishedValue={
            publishedStory
              .imageCaption ??
            ''
          }
          revisionValue={
            revisionStory
              .imageCaption ??
            ''
          }
        />

        <MetadataField
          label="Image credit"
          publishedValue={
            publishedStory
              .imageCredit ??
            ''
          }
          revisionValue={
            revisionStory
              .imageCredit ??
            ''
          }
        />

        <MetadataField
          label="Primary category"
          publishedValue={
            locale === 'es'
              ? publishedStory
                  .primaryCategory
                  ?.nameEs ??
                ''
              : publishedStory
                  .primaryCategory
                  ?.nameEn ??
                ''
          }
          revisionValue={
            locale === 'es'
              ? revisionStory
                  .primaryCategory
                  ?.nameEs ??
                ''
              : revisionStory
                  .primaryCategory
                  ?.nameEn ??
                ''
          }
        />

        <MetadataField
          label="Categories"
          publishedValue={joinCategories(
            publishedStory,
            locale
          )}
          revisionValue={joinCategories(
            revisionStory,
            locale
          )}
        />

        <MetadataField
          label="Tags"
          publishedValue={joinTags(
            publishedStory
          )}
          revisionValue={joinTags(
            revisionStory
          )}
        />

        <MetadataField
          label="Island"
          publishedValue={islandLabel(
            publishedStory.island,
            locale
          )}
          revisionValue={islandLabel(
            revisionStory.island,
            locale
          )}
        />

        <MetadataField
          label="Author"
          publishedValue={
            publishedStory.author
              ?.name ??
            ''
          }
          revisionValue={
            revisionStory.author
              ?.name ??
            ''
          }
        />

        <MetadataField
          label="Editor"
          publishedValue={
            publishedStory.editor
              ?.name ??
            ''
          }
          revisionValue={
            revisionStory.editor
              ?.name ??
            ''
          }
        />

        <MetadataField
          label="Slug"
          publishedValue={
            publishedStory.slug
          }
          revisionValue={
            revisionStory.slug
          }
        />

        <MetadataField
          label="Access level"
          publishedValue={
            publishedStory.accessLevel
          }
          revisionValue={
            revisionStory.accessLevel
          }
        />

        <MetadataField
          label="Originally published"
          publishedValue={formatDate(
            publishedStory
              .originallyPublishedAt
          )}
          revisionValue={formatDate(
            revisionStory
              .originallyPublishedAt
          )}
        />

        <MetadataField
          label="Scheduled for"
          publishedValue={formatDate(
            publishedStory
              .scheduledAt
          )}
          revisionValue={formatDate(
            revisionStory
              .scheduledAt
          )}
        />

        <MetadataField
          label="SEO title"
          publishedValue={
            publishedStory
              .seoTitle ??
            ''
          }
          revisionValue={
            revisionStory
              .seoTitle ??
            ''
          }
        />

        <MetadataField
          label="SEO description"
          publishedValue={
            publishedStory
              .seoDescription ??
            ''
          }
          revisionValue={
            revisionStory
              .seoDescription ??
            ''
          }
        />
      </div>
    </div>
  );
}