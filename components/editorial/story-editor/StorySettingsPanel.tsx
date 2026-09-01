'use client';

import {
  useState,
} from 'react';

import {
  ExternalLink,
  X,
} from 'lucide-react';

import type {
  AccessLevel,
  IslandScope,
  StoryLanguage,
} from '@/lib/db/database.types';

import {
  islandLabel,
} from '@/types/editorial';

import {
  cn,
} from '@/lib/utils';

import type {
  StorySettingsPanelProps,
} from './types';

import {
  StoryVersionHistory,
} from './StoryVersionHistory';

function getLocalDateTimeValue(
  date = new Date()
) {
  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60_000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function getLocalDateValue(
  date = new Date()
) {
  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60_000
    );

  return localDate
    .toISOString()
    .slice(0, 10);
}

export function StorySettingsPanel({
  dict,
  locale,
  language,
  status,
  accessLevel,
  authorId,
  editorId,
  primaryCategoryId,
  selectedCategoryIds,
  tags,
  allTags,
  tagSearch,
  island,
  featuredImage,
  imageCaption,
  imageCredit,
  seoTitle,
  seoDescription,
  slug,
  slugLocked,
  originallyPublishedAt,
  scheduledAt,
  versions,
  userIsEditor,
  categories,
  authors,
  editors,
  setLanguage,
  setAccessLevel,
  setAuthorId,
  setEditorId,
  setPrimaryCategoryId,
  setIsland,
  setSlug,
  setOriginallyPublishedAt,
  setScheduledAt,
  setImageCaption,
  setImageCredit,
  setSeoTitle,
  setSeoDescription,
  toggleCategory,
  toggleTag,
  searchTags,
  createTag,
  setFeaturedImage,
  setMediaPickerOpen,
  handleRestoreVersion,
}: StorySettingsPanelProps) {
  const [
    hasOriginalPublication,
    setHasOriginalPublication,
  ] = useState(
    Boolean(
      originallyPublishedAt
    )
  );

  const islandOptions: IslandScope[] = [
    'san_andres',
    'old_providence',
    'saint_catalina',
    'archipelago',
    'none',
  ];

  const accessOptions: AccessLevel[] = [
    'public',
    'registered',
    'subscriber',
    'premium',
  ];

  const scheduleMode:
    | 'now'
    | 'later' =
    scheduledAt
      ? 'later'
      : 'now';

  const now =
    getLocalDateTimeValue();

  const today =
    getLocalDateValue();

  function selectPublishNow() {
    setScheduledAt('');
  }

  function selectPublishLater() {
    if (!scheduledAt) {
      setScheduledAt(
        now
      );
    }
  }

  function handleScheduledChange(
    value: string
  ) {
    if (!value) {
      setScheduledAt('');
      return;
    }

    if (
      value < now
    ) {
      return;
    }

    setScheduledAt(
      value
    );
  }

  function handleOriginalPublicationToggle(
    checked: boolean
  ) {
    setHasOriginalPublication(
      checked
    );

    if (!checked) {
      setOriginallyPublishedAt(
        ''
      );
    }
  }

  function handleOriginalPublicationDateChange(
    value: string
  ) {
    if (!value) {
      setOriginallyPublishedAt(
        ''
      );
      return;
    }

    if (
      value > today
    ) {
      return;
    }

    setOriginallyPublishedAt(
      value
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Publication */}
      <Section
        title={
          dict.story.publication
        }
      >
        {/* Status */}
        <Field
          label={
            dict.story.status
          }
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {status}
            </span>

            {status ===
              'published' && (
              <a
                href={`/${locale}/article/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  language ===
                  'es'
                    ? 'Ver artículo publicado'
                    : 'View published article'
                }
                title={
                  language ===
                  'es'
                    ? 'Ver artículo publicado'
                    : 'View published article'
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
                  hover:border-primary
                  hover:bg-primary/5
                  hover:text-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                <ExternalLink
                  className="h-3.5 w-3.5"
                  aria-hidden
                />
              </a>
            )}
          </div>
        </Field>

        {/* Originally published */}
        <Field
          label={
            dict.story
              .originallyPublishedDate
          }
          hint={
            dict.story
              .originallyPublishedDateHint
          }
        >
          <label
            className="
              flex
              cursor-pointer
              items-center
              gap-2
            "
          >
            <input
              type="checkbox"
              checked={
                hasOriginalPublication
              }
              onChange={(
                event
              ) =>
                handleOriginalPublicationToggle(
                  event.target
                    .checked
                )
              }
              className="
                h-4
                w-4
                shrink-0
                accent-primary
              "
            />

            <span className="text-[12px] text-foreground">
              {language ===
              'es'
                ? 'Este artículo fue publicado anteriormente'
                : 'This story was published previously'}
            </span>
          </label>

          {hasOriginalPublication && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-foreground">
                {language ===
                'es'
                  ? 'Fecha original'
                  : 'Original date'}
              </label>

              <input
                type="date"
                value={
                  originallyPublishedAt
                    ? originallyPublishedAt.slice(
                        0,
                        10
                      )
                    : ''
                }
                max={
                  today
                }
                onChange={(
                  event
                ) =>
                  handleOriginalPublicationDateChange(
                    event.target
                      .value
                  )
                }
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-2
                  text-sm
                  text-foreground
                  focus:border-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              />
            </div>
          )}
        </Field>

        {/* Scheduled for */}
        <Field
          label={
            dict.story
              .scheduledDate
          }
          hint={
            scheduleMode ===
            'now'
              ? language ===
                'es'
                ? 'La historia se publicará inmediatamente cuando la publiques.'
                : 'The story will go live immediately when you publish it.'
              : language ===
                  'es'
                ? 'Elige cuándo debe publicarse la historia.'
                : 'Choose when the story should go live.'
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={
                selectPublishNow
              }
              className={cn(
                `
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  px-3
                  text-sm
                  font-medium
                  transition-colors
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                `,
                scheduleMode ===
                  'now'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-foreground hover:bg-surface-muted'
              )}
            >
              {language ===
              'es'
                ? 'Ahora'
                : 'Now'}
            </button>

            <button
              type="button"
              onClick={
                selectPublishLater
              }
              className={cn(
                `
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  px-3
                  text-sm
                  font-medium
                  transition-colors
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                `,
                scheduleMode ===
                  'later'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-foreground hover:bg-surface-muted'
              )}
            >
              {language ===
              'es'
                ? 'Más tarde'
                : 'Later'}
            </button>
          </div>

          {scheduleMode ===
            'later' && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-foreground">
                {language ===
                'es'
                  ? 'Fecha y hora'
                  : 'Date and time'}
              </label>

              <input
                type="datetime-local"
                value={
                  scheduledAt
                }
                min={
                  now
                }
                onChange={(
                  event
                ) =>
                  handleScheduledChange(
                    event.target
                      .value
                  )
                }
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-2
                  text-sm
                  text-foreground
                  focus:border-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              />
            </div>
          )}
        </Field>
      </Section>

      {/* Language */}
      <Section
        title={
          dict.story.language
        }
      >
        <div className="flex gap-2">
          {(
            [
              'en',
              'es',
            ] as StoryLanguage[]
          ).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setLanguage(
                    item
                  )
                }
                className={cn(
                  `
                    flex-1
                    rounded-lg
                    border
                    px-3
                    py-1.5
                    text-sm
                    font-medium
                    transition-colors
                  `,
                  language ===
                    item
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-white text-foreground hover:bg-surface-muted'
                )}
              >
                {item ===
                'en'
                  ? dict.common
                      .languageEN
                  : dict.common
                      .languageES}
              </button>
            )
          )}
        </div>
      </Section>

      {/* Author & Editor */}
      <Section
        title={
          dict.story.author
        }
      >
        <Field
          label={
            dict.story.author
          }
        >
          <select
            value={
              authorId ?? ''
            }
            onChange={(event) =>
              setAuthorId(
                event.target
                  .value ||
                  null
              )
            }
            disabled={
              !userIsEditor
            }
            className="
              h-9
              w-full
              rounded-lg
              border
              border-border
              bg-white
              px-2
              text-sm
              text-foreground
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:bg-surface-muted
            "
          >
            <option value="">
              {
                dict.story
                  .selectAuthor
              }
            </option>

            {authors.map(
              (author) => (
                <option
                  key={
                    author.id
                  }
                  value={
                    author.id
                  }
                >
                  {
                    author.name
                  }
                </option>
              )
            )}
          </select>
        </Field>

        <Field
          label={
            dict.story.editor
          }
        >
          <select
            value={
              editorId ?? ''
            }
            onChange={(event) =>
              setEditorId(
                event.target
                  .value ||
                  null
              )
            }
            disabled={
              !userIsEditor
            }
            className="
              h-9
              w-full
              rounded-lg
              border
              border-border
              bg-white
              px-2
              text-sm
              text-foreground
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:bg-surface-muted
            "
          >
            <option value="">
              {
                dict.story
                  .selectEditor
              }
            </option>

            {editors.map(
              (editor) => (
                <option
                  key={
                    editor.id
                  }
                  value={
                    editor.id
                  }
                >
                  {
                    editor.name
                  }
                </option>
              )
            )}
          </select>
        </Field>
      </Section>

      {/* Categories */}
      <Section
        title={
          dict.story
            .primaryCategory
        }
      >
        <Field
          label={
            dict.story
              .primaryCategory
          }
        >
          <select
            value={
              primaryCategoryId ??
              ''
            }
            onChange={(event) =>
              setPrimaryCategoryId(
                event.target
                  .value ||
                  null
              )
            }
            className="
              h-9
              w-full
              rounded-lg
              border
              border-border
              bg-white
              px-2
              text-sm
              text-foreground
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            <option value="">
              {
                dict.story
                  .selectCategory
              }
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {language ===
                  'es'
                    ? category.nameEs
                    : category.nameEn}
                </option>
              )
            )}
          </select>
        </Field>

        <Field
          label={
            dict.story
              .additionalCategories
          }
        >
          <div className="max-h-40 overflow-y-auto border border-border bg-white p-2">
            {categories.map(
              (category) => (
                <label
                  key={
                    category.id
                  }
                  className="
                    flex
                    cursor-pointer
                    items-center
                    gap-2
                    py-1
                    text-sm
                    hover:bg-surface-muted
                  "
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(
                      category.id
                    )}
                    onChange={() =>
                      toggleCategory(
                        category.id
                      )
                    }
                    className="h-4 w-4 accent-primary"
                  />

                  <span className="text-foreground">
                    {language ===
                    'es'
                      ? category.nameEs
                      : category.nameEn}
                  </span>
                </label>
              )
            )}
          </div>
        </Field>
      </Section>

      {/* Tags */}
      <Section
        title={
          dict.story.tags
        }
      >
        <input
          type="search"
          value={tagSearch}
          onChange={(event) =>
            searchTags(
              event.target.value
            )
          }
          placeholder={
            dict.story
              .searchTags
          }
          className="
            h-9
            w-full
            rounded-lg
            border
            border-border
            bg-white
            px-3
            text-sm
            text-foreground
            placeholder:text-muted-foreground
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        />

        {tagSearch.trim()
          .length >= 2 &&
          !allTags.find(
            (tag) =>
              tag.name.toLowerCase() ===
              tagSearch
                .trim()
                .toLowerCase()
          ) && (
            <button
              type="button"
              onClick={() =>
                createTag(
                  tagSearch.trim()
                )
              }
              className="
                mt-2
                flex
                w-full
                items-center
                gap-1
                rounded-lg
                border
                border-dashed
                border-primary
                px-3
                py-1.5
                text-sm
                text-primary
                hover:bg-primary/5
              "
            >
              +{' '}
              {
                dict.story
                  .createTag
              }
              : &ldquo;
              {tagSearch.trim()}
              &rdquo;
            </button>
          )}

        {tagSearch.trim()
          .length >= 2 &&
          allTags.length >
            0 && (
            <div className="mt-2 max-h-32 overflow-y-auto border border-border bg-white">
              {allTags
                .filter(
                  (tag) =>
                    !tags.find(
                      (
                        selectedTag
                      ) =>
                        selectedTag.id ===
                        tag.id
                    )
                )
                .slice(
                  0,
                  10
                )
                .map(
                  (tag) => (
                    <button
                      key={
                        tag.id
                      }
                      type="button"
                      onClick={() =>
                        toggleTag(
                          tag.id
                        )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        px-3
                        py-1.5
                        text-sm
                        text-foreground
                        hover:bg-surface-muted
                      "
                    >
                      +{' '}
                      {
                        tag.name
                      }
                    </button>
                  )
                )}
            </div>
          )}

        {tags.length >
          0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map(
              (tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    toggleTag(
                      tag.id
                    )
                  }
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-lg
                    border
                    border-primary/30
                    bg-primary/5
                    px-2
                    py-0.5
                    text-xs
                    font-medium
                    text-primary
                    transition-colors
                    hover:bg-breaking/5
                    hover:text-breaking
                  "
                >
                  {tag.name}

                  <X
                    className="h-3 w-3"
                    aria-hidden
                  />
                </button>
              )
            )}
          </div>
        )}
      </Section>

      {/* Island */}
      <Section
        title={
          dict.story.island
        }
      >
        <select
          value={island}
          onChange={(event) =>
            setIsland(
              event.target
                .value as IslandScope
            )
          }
          className="
            h-9
            w-full
            rounded-lg
            border
            border-border
            bg-white
            px-2
            text-sm
            text-foreground
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          {islandOptions.map(
            (option) => (
              <option
                key={
                  option
                }
                value={
                  option
                }
              >
                {islandLabel(
                  option,
                  language
                )}
              </option>
            )
          )}
        </select>
      </Section>

      {/* Access */}
      <Section
        title={
          dict.story.access
        }
      >
        <select
          value={
            accessLevel
          }
          onChange={(event) =>
            setAccessLevel(
              event.target
                .value as AccessLevel
            )
          }
          className="
            h-9
            w-full
            rounded-lg
            border
            border-border
            bg-white
            px-2
            text-sm
            text-foreground
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          {accessOptions.map(
            (option) => (
              <option
                key={
                  option
                }
                value={
                  option
                }
              >
                {option ===
                'public'
                  ? dict.story
                      .publicAccess
                  : option ===
                      'registered'
                    ? dict.story
                        .registeredAccess
                    : option ===
                        'subscriber'
                      ? dict.story
                          .subscriberAccess
                      : dict.story
                          .premiumAccess}
              </option>
            )
          )}
        </select>
      </Section>

      {/* Featured image */}
<Section
  title={
    dict.story
      .featuredImage
  }
>
  {featuredImage ? (
    <>
      <div>
        <img
          src={
            featuredImage.url
          }
          alt={
            featuredImage.altText ||
            imageCaption ||
            ''
          }
          className="
            aspect-video
            w-full
            rounded-lg
            bg-surface-subtle
            object-cover
          "
        />

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setMediaPickerOpen(
                true
              )
            }
            className="
              text-xs
              font-medium
              text-primary
              hover:underline
            "
          >
            {
              dict.story
                .selectFromMedia
            }
          </button>

          <button
            type="button"
            onClick={() => {
              setFeaturedImage(
                null
              );

              setImageCaption(
                ''
              );

              setImageCredit(
                ''
              );
            }}
            className="
              text-xs
              font-medium
              text-breaking
              hover:underline
            "
          >
            {
              dict.story
                .removeImage
            }
          </button>
        </div>
      </div>

      {/* Description */}
      <Field
        label={
          language === 'es'
            ? 'Descripción'
            : 'Description'
        }
        hint={
          language === 'es'
            ? 'Describe lo que aparece en la imagen.'
            : 'Describe what is shown in the image.'
        }
      >
        <textarea
          value={
            imageCaption
          }
          onChange={(
            event
          ) =>
            setImageCaption(
              event.target.value
            )
          }
          rows={3}
          placeholder={
            language === 'es'
              ? 'Describe la imagen…'
              : 'Describe the image…'
          }
          className="
            w-full
            resize-y
            rounded-lg
            border
            border-border
            bg-white
            px-3
            py-2
            text-sm
            leading-relaxed
            text-foreground
            placeholder:text-muted-foreground
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        />
      </Field>

      {/* Credit */}
      <Field
        label={
          language === 'es'
            ? 'Crédito'
            : 'Credit'
        }
        hint={
          language === 'es'
            ? 'Fotógrafo, agencia o fuente de la imagen.'
            : 'Photographer, agency or image source.'
        }
      >
        <input
          type="text"
          value={
            imageCredit
          }
          onChange={(
            event
          ) =>
            setImageCredit(
              event.target.value
            )
          }
          placeholder={
            language === 'es'
              ? 'Fotógrafo / Agencia / Fuente'
              : 'Photographer / Agency / Source'
          }
          className="
            h-9
            w-full
            rounded-lg
            border
            border-border
            bg-white
            px-3
            text-sm
            text-foreground
            placeholder:text-muted-foreground
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        />
      </Field>

      {/* Caption preview */}
      {(imageCaption ||
        imageCredit) && (
        <div
          className="
            border-t
            border-border
            pt-3
          "
        >
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {language === 'es'
              ? 'Vista previa'
              : 'Preview'}
          </p>

          <p
            className="
              font-headline
              text-sm
              leading-[1.45]
              text-muted-foreground
            "
          >
            {imageCaption && (
              <span>
                {imageCaption}
              </span>
            )}

            {imageCaption &&
              imageCredit &&
              ' '}

            {imageCredit && (
              <em>
                (
                {imageCredit}
                )
              </em>
            )}
          </p>
        </div>
      )}
    </>
  ) : (
    <button
      type="button"
      onClick={() =>
        setMediaPickerOpen(
          true
        )
      }
      className="
        flex
        w-full
        items-center
        justify-center
        rounded-lg
        border
        border-dashed
        border-border
        bg-white
        py-8
        text-sm
        text-muted-foreground
        transition-colors
        hover:border-primary
        hover:text-primary
      "
    >
      {
        dict.story
          .selectFromMedia
      }
    </button>
  )}
</Section>

      {/* SEO */}
      <Section title="SEO">
        <Field
          label={
            dict.story.seoTitle
          }
          hint={
            dict.story
              .seoTitleHint
          }
        >
          <input
            type="text"
            value={seoTitle}
            onChange={(event) =>
              setSeoTitle(
                event.target.value
              )
            }
            maxLength={70}
            className="
              h-9
              w-full
              rounded-lg
              border
              border-border
              bg-white
              px-2
              text-sm
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          />

          <CharCount
            value={
              seoTitle
            }
            target={60}
          />
        </Field>

        <Field
          label={
            dict.story
              .seoDescription
          }
          hint={
            dict.story
              .seoDescriptionHint
          }
        >
          <textarea
            value={
              seoDescription
            }
            onChange={(event) =>
              setSeoDescription(
                event.target.value
              )
            }
            maxLength={170}
            rows={3}
            className="
              w-full
              rounded-lg
              border
              border-border
              bg-white
              px-2
              py-1.5
              text-sm
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          />

          <CharCount
            value={
              seoDescription
            }
            target={160}
          />
        </Field>
      </Section>

      {/* Slug */}
      <Section
        title={
          dict.story.slug
        }
      >
        <input
          type="text"
          value={slug}
          onChange={(event) =>
            setSlug(
              event.target.value
            )
          }
          disabled={
            slugLocked
          }
          className="
            h-9
            w-full
            rounded-lg
            border
            border-border
            bg-white
            px-2
            text-sm
            focus:border-primary
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            disabled:bg-surface-muted
            disabled:text-muted-foreground
          "
        />

        {slugLocked && (
          <p className="mt-1 text-xs text-muted-foreground">
            {
              dict.story
                .slugLocked
            }
          </p>
        )}
      </Section>

      {/* Version history */}
      <Section
        title={
          dict.story
            .versionHistory
        }
      >
        <StoryVersionHistory
          dict={dict}
          versions={versions}
          canRestore={
            userIsEditor
          }
          onRestore={
            handleRestoreVersion
          }
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-deep">
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground">
        {label}
      </label>

      {hint && (
        <p className="text-[0.6875rem] text-muted-foreground">
          {hint}
        </p>
      )}

      <div className="mt-1">
        {children}
      </div>
    </div>
  );
}

function CharCount({
  value,
  target,
}: {
  value: string;
  target: number;
}) {
  const length =
    value.length;

  const color =
    length === 0
      ? 'text-muted-foreground'
      : length <= target
        ? 'text-live'
        : 'text-breaking';

  return (
    <p
      className={cn(
        'mt-0.5 text-[0.6875rem]',
        color
      )}
    >
      {length} / {target}+
    </p>
  );
}