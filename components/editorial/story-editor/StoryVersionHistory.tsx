'use client';

import {
  Fragment,
  useState,
} from 'react';

import {
  Eye,
  GitCompare,
  RotateCcw,
  X,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryVersion,
} from '@/types/editorial';

interface StoryVersionHistoryProps {
  dict: Dictionary;

  versions:
    StoryVersion[];

  canRestore:
    boolean;

  onRestore: (
    versionId:
      string
  ) => void;
}

export function StoryVersionHistory({
  dict,
  versions,
  canRestore,
  onRestore,
}: StoryVersionHistoryProps) {
  const [
    selectedVersion,
    setSelectedVersion,
  ] =
    useState<
      StoryVersion | null
    >(null);

  function closePreview() {
    setSelectedVersion(
      null
    );
  }

  function restoreSelectedVersion() {
    if (
      !selectedVersion
    ) {
      return;
    }

    const versionId =
      selectedVersion.id;

    setSelectedVersion(
      null
    );

    onRestore(
      versionId
    );
  }

  function compareSelectedVersion() {
    if (
      !selectedVersion
    ) {
      return;
    }

    window.location.href =
      `/newsroom/stories/${selectedVersion.storyId}/preview` +
      `?version=${selectedVersion.id}&view=changes`;
  }

  if (
    versions.length ===
    0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        {
          dict.story
            .noVersions
        }
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {versions
          .slice(
            0,
            10
          )
          .map(
            (
              version
            ) => (
              <div
                key={
                  version.id
                }
                className="
                  rounded-lg
                  border
                  border-border
                  bg-white
                  p-2.5
                "
              >
                <p
                  className="
                    truncate
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  {version.headline ||
                    '(untitled)'}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  {new Date(
                    version.createdAt
                  ).toLocaleString(
                    undefined,
                    {
                      dateStyle:
                        'medium',

                      timeStyle:
                        'short',
                    }
                  )}

                  {version.createdByName &&
                    ` · ${dict.story.versionSavedBy} ${version.createdByName}`}
                </p>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-1.5
                  "
                >
                  {/* View version */}

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedVersion(
                        version
                      )
                    }
                    className="
                      inline-flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-border
                      bg-white
                      text-muted-foreground
                      transition-colors
                      hover:border-primary/30
                      hover:bg-primary/5
                      hover:text-primary
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                    "
                    aria-label="View version"
                    title="View version"
                  >
                    <Eye
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
                  </button>

                  {/* Restore */}

                  {canRestore && (
                    <button
                      type="button"
                      onClick={() =>
                        onRestore(
                          version.id
                        )
                      }
                      className="
                        inline-flex
                        h-7
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-border
                        bg-white
                        px-2.5
                        text-xs
                        font-semibold
                        text-foreground
                        transition-colors
                        hover:border-star/30
                        hover:bg-star/5
                        hover:text-star
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                      "
                    >
                      <RotateCcw
                        className="h-3.5 w-3.5"
                        aria-hidden
                      />

                      {
                        dict.story
                          .restore
                      }
                    </button>
                  )}
                </div>
              </div>
            )
          )}
      </div>

      {/* =================================================
          Historical version preview
      ================================================= */}

      {selectedVersion && (
        <div
          className="
            fixed
            inset-0
            z-[120]
            flex
            items-center
            justify-center
            p-3
            sm:p-6
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="version-preview-title"
        >
          {/* Backdrop */}

          <button
            type="button"
            className="
              absolute
              inset-0
              bg-deep/60
            "
            aria-label="Close"
            onClick={
              closePreview
            }
          />

          {/* Modal */}

          <div
            className="
              relative
              z-10
              flex
              max-h-[92vh]
              w-full
              max-w-5xl
              flex-col
              overflow-hidden
              rounded-xl
              border
              border-border
              bg-white
              shadow-2xl
            "
          >
            {/* Toolbar */}

            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                gap-4
                border-b
                border-border
                bg-deep
                px-4
                py-3
                text-white
                sm:px-5
              "
            >
              <div className="min-w-0">
                <p
                  className="
                    text-[0.6875rem]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                    text-white/55
                  "
                >
                  Historical version
                </p>

                <p
                  className="
                    mt-0.5
                    truncate
                    text-xs
                    text-white/75
                  "
                >
                  {new Date(
                    selectedVersion.createdAt
                  ).toLocaleString(
                    undefined,
                    {
                      dateStyle:
                        'medium',

                      timeStyle:
                        'short',
                    }
                  )}
                </p>
              </div>

              <div
                className="
                  flex
                  shrink-0
                  items-center
                  gap-2
                "
              >
                {/* Compare */}

                <button
                  type="button"
                  onClick={
                    compareSelectedVersion
                  }
                  className="
                    inline-flex
                    h-8
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    border-white/20
                    bg-white/5
                    px-3
                    text-xs
                    font-semibold
                    text-white
                    transition-colors
                    hover:bg-white/10
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-white/50
                  "
                >
                  <GitCompare
                    className="h-3.5 w-3.5"
                    aria-hidden
                  />

                  <span className="hidden sm:inline">
                    Compare to live
                  </span>

                  <span className="sm:hidden">
                    Compare
                  </span>
                </button>

                {/* Restore */}

                {canRestore && (
                  <button
                    type="button"
                    onClick={
                      restoreSelectedVersion
                    }
                    className="
                      inline-flex
                      h-8
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-star
                      px-3
                      text-xs
                      font-semibold
                      text-white
                      transition-colors
                      hover:bg-star/90
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-white/50
                    "
                  >
                    <RotateCcw
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />

                    {
                      dict.story
                        .restore
                    }
                  </button>
                )}

                {/* Close */}

                <button
                  type="button"
                  onClick={
                    closePreview
                  }
                  className="
                    inline-flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    text-white/70
                    transition-colors
                    hover:bg-white/10
                    hover:text-white
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-white/50
                  "
                  aria-label="Close"
                >
                  <X
                    className="h-4 w-4"
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            {/* Scrollable article preview */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                bg-white
              "
            >
              {/* Header */}

              <header
                className="
                  border-b
                  border-border
                "
              >
                <div
                  className="
                    mx-auto
                    max-w-3xl
                    px-5
                    py-8
                    sm:px-8
                    sm:py-10
                  "
                >
                  <p
                    className="
                      text-[0.6875rem]
                      font-semibold
                      uppercase
                      tracking-[0.14em]
                      text-star
                    "
                  >
                    Saved version
                  </p>

                  <h1
                    id="version-preview-title"
                    className="
                      mt-3
                      font-headline
                      text-3xl
                      font-bold
                      leading-tight
                      text-deep
                      sm:text-4xl
                    "
                  >
                    {selectedVersion.headline ||
                      '(untitled)'}
                  </h1>

                  {selectedVersion.subheadline && (
                    <p
                      className="
                        mt-4
                        font-headline
                        text-lg
                        italic
                        leading-snug
                        text-muted-foreground
                      "
                    >
                      {
                        selectedVersion
                          .subheadline
                      }
                    </p>
                  )}

                  {selectedVersion.summary && (
                    <p
                      className="
                        mt-4
                        text-base
                        leading-relaxed
                        text-foreground
                      "
                    >
                      {
                        selectedVersion
                          .summary
                      }
                    </p>
                  )}

                  <div
                    className="
                      mt-6
                      border-t
                      border-border
                      pt-4
                      text-xs
                      text-muted-foreground
                    "
                  >
                    Saved{' '}
                    {new Date(
                      selectedVersion.createdAt
                    ).toLocaleString(
                      undefined,
                      {
                        dateStyle:
                          'long',

                        timeStyle:
                          'short',
                      }
                    )}

                    {selectedVersion.createdByName &&
                      ` · ${dict.story.versionSavedBy} ${selectedVersion.createdByName}`}
                  </div>
                </div>
              </header>

              {/* Body */}

              <div
                className="
                  mx-auto
                  max-w-2xl
                  px-5
                  py-8
                  sm:px-8
                  sm:py-10
                "
              >
                <VersionArticleBody
                  body={
                    selectedVersion.body
                  }
                />
              </div>

              {/* Historical warning */}

              <div
                className="
                  border-t
                  border-border
                  bg-surface-muted
                  px-5
                  py-4
                  text-center
                  text-xs
                  text-muted-foreground
                "
              >
                This is a saved historical version and is not the
                currently published article.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Lightweight renderer for historical TipTap JSON.
 *
 * This intentionally mirrors the article renderer so the
 * saved version looks close to the real article without
 * changing or restoring anything.
 */
function VersionArticleBody({
  body,
}: {
  body: Record<
    string,
    unknown
  >;
}) {
  return (
    <div className="article-body">
      {renderNode(
        body
      )}
    </div>
  );
}

function renderNode(
  node: Record<
    string,
    unknown
  >
): React.ReactNode {
  const type =
    node.type as string;

  const content =
    node.content as
      | Record<
          string,
          unknown
        >[]
      | undefined;

  switch (type) {
    case 'doc':
      return (
        content ??
        []
      ).map(
        (
          child,
          index
        ) => (
          <Fragment
            key={
              index
            }
          >
            {renderNode(
              child
            )}
          </Fragment>
        )
      );

    case 'paragraph':
      return (
        <p>
          {(content ?? []).map(
            (
              child,
              index
            ) => (
              <Fragment
                key={
                  index
                }
              >
                {renderInline(
                  child
                )}
              </Fragment>
            )
          )}
        </p>
      );

    case 'heading': {
      const attrs =
        node.attrs as
          | Record<
              string,
              unknown
            >
          | undefined;

      const level =
        attrs?.level as
          | number
          | undefined;

      const children =
        (
          content ??
          []
        ).map(
          (
            child,
            index
          ) => (
            <Fragment
              key={
                index
              }
            >
              {renderInline(
                child
              )}
            </Fragment>
          )
        );

      if (
        level === 3
      ) {
        return (
          <h3>
            {children}
          </h3>
        );
      }

      return (
        <h2>
          {children}
        </h2>
      );
    }

    case 'bulletList':
      return (
        <ul>
          {(content ?? []).map(
            (
              child,
              index
            ) => (
              <Fragment
                key={
                  index
                }
              >
                {renderNode(
                  child
                )}
              </Fragment>
            )
          )}
        </ul>
      );

    case 'orderedList':
      return (
        <ol>
          {(content ?? []).map(
            (
              child,
              index
            ) => (
              <Fragment
                key={
                  index
                }
              >
                {renderNode(
                  child
                )}
              </Fragment>
            )
          )}
        </ol>
      );

    case 'listItem':
      return (
        <li>
          {(content ?? []).map(
            (
              child,
              index
            ) => (
              <Fragment
                key={
                  index
                }
              >
                {renderNode(
                  child
                )}
              </Fragment>
            )
          )}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote>
          {(content ?? []).map(
            (
              child,
              index
            ) => (
              <Fragment
                key={
                  index
                }
              >
                {renderNode(
                  child
                )}
              </Fragment>
            )
          )}
        </blockquote>
      );

    case 'horizontalRule':
      return <hr />;

    case 'image': {
      const attrs =
        node.attrs as
          | Record<
              string,
              unknown
            >
          | undefined;

      const src =
        (
          attrs?.src as
            | string
            | undefined
        ) ?? '';

      const alt =
        (
          attrs?.alt as
            | string
            | undefined
        ) ?? '';

      const description =
        (
          attrs?.description as
            | string
            | null
            | undefined
        ) ?? null;

      const credit =
        (
          attrs?.credit as
            | string
            | null
            | undefined
        ) ?? null;

      if (!src) {
        return null;
      }

      return (
        <figure className="my-8">
          <img
            src={
              src
            }
            alt={
              alt
            }
            className="
              block
              h-auto
              w-full
              bg-surface-subtle
              object-cover
            "
          />

          {(description ||
            credit) && (
            <figcaption
              className="
                mt-2
                font-headline
                text-[0.95rem]
                leading-[1.45]
                text-muted-foreground
              "
            >
              {description && (
                <span>
                  {
                    description
                  }
                </span>
              )}

              {description &&
                credit &&
                ' '}

              {credit && (
                <em>
                  (
                  {
                    credit
                  }
                  )
                </em>
              )}
            </figcaption>
          )}
        </figure>
      );
    }

    default:
      if (
        content
      ) {
        return content.map(
          (
            child,
            index
          ) => (
            <Fragment
              key={
                index
              }
            >
              {renderNode(
                child
              )}
            </Fragment>
          )
        );
      }

      return null;
  }
}

function renderInline(
  node: Record<
    string,
    unknown
  >
): React.ReactNode {
  const type =
    node.type as string;

  const content =
    node.content as
      | Record<
          string,
          unknown
        >[]
      | undefined;

  if (
    type === 'text'
  ) {
    const marks =
      node.marks as
        | Record<
            string,
            unknown
          >[]
        | undefined;

    let text:
      React.ReactNode =
      node.text as string;

    if (
      marks
    ) {
      for (
        const mark of
        marks
      ) {
        const markType =
          mark.type as string;

        if (
          markType ===
          'bold'
        ) {
          text = (
            <strong>
              {text}
            </strong>
          );
        }

        if (
          markType ===
          'italic'
        ) {
          text = (
            <em>
              {text}
            </em>
          );
        }

        if (
          markType ===
          'underline'
        ) {
          text = (
            <u>
              {text}
            </u>
          );
        }

        if (
          markType ===
          'link'
        ) {
          const attrs =
            mark.attrs as
              | Record<
                  string,
                  unknown
                >
              | undefined;

          text = (
            <a
              href={
                (
                  attrs?.href as
                    | string
                    | undefined
                ) ?? '#'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {text}
            </a>
          );
        }
      }
    }

    return text;
  }

  if (
    type ===
    'hardBreak'
  ) {
    return <br />;
  }

  if (
    content
  ) {
    return content.map(
      (
        child,
        index
      ) => (
        <Fragment
          key={
            index
          }
        >
          {renderInline(
            child
          )}
        </Fragment>
      )
    );
  }

  return null;
}