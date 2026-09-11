'use client';

import { useState } from 'react';

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

/* ========================================================= */
/* DATE HELPERS */
/* ========================================================= */

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

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function StorySettingsPanel({
  dict,
  locale,
  language,
  status,
  accessLevel,
  shortTitle,
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
  setShortTitle,
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
  removeFeaturedImage,
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

  const islandOptions:
    IslandScope[] = [
    'san_andres',
    'old_providence',
    'saint_catalina',
    'archipelago',
    'none',
  ];

  const accessOptions:
    AccessLevel[] = [
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

  /* ======================================================= */
  /* PUBLICATION HELPERS */
  /* ======================================================= */

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

    if (value < now) {
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

    if (value > today) {
      return;
    }

    setOriginallyPublishedAt(
      value
    );
  }

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div className="space-y-6 p-4">
      {/* =================================================== */}
      {/* PUBLICATION */}
      {/* =================================================== */}

      <Section
        title={
          dict.story.publication
        }
      >
        <Field
          label={
            dict.story.status
          }
        >
          <div className="flex items-center gap-2">
            <span
              className="
                inline-flex
                items-center
                rounded-full
                border
                border-border
                bg-white
                px-2
                py-1
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-primary
              "
            >
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
                max={today}
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
                min={now}
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

      {/* =================================================== */}
      {/* SHORT TITLE */}
      {/* =================================================== */}

      <Section
        title={
          language === 'es'
            ? 'Título corto'
            : 'Short title'
        }
      >
        <Field
          label={
            language === 'es'
              ? 'Título corto'
              : 'Short title'
          }
          hint={
            language === 'es'
              ? 'Una versión más corta del titular para barras de noticias y otros espacios compactos.'
              : 'A shorter version of the headline for story bars and other compact editorial areas.'
          }
        >
          <input
            type="text"
            value={
              shortTitle
            }
            onChange={(
              event
            ) =>
              setShortTitle(
                event.target.value
              )
            }
            placeholder={
              language === 'es'
                ? 'Escribe un título corto'
                : 'Enter a short title'
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
              placeholder:text-muted-foreground/60
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          />

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-4 text-muted-foreground">
              {language === 'es'
                ? 'Si se deja vacío, se utilizará el titular completo.'
                : 'If empty, the full headline will be used.'}
            </p>

            <span
              className={cn(
                'shrink-0 text-[11px]',
                shortTitle.length >
                  60
                  ? 'font-medium text-breaking'
                  : 'text-muted-foreground'
              )}
            >
              {shortTitle.length}
              /60
            </span>
          </div>
        </Field>
      </Section>

      {/* =================================================== */}
      {/* LANGUAGE */}
      {/* =================================================== */}

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
                {item === 'en'
                  ? dict.common
                      .languageEN
                  : dict.common
                      .languageES}
              </button>
            )
          )}
        </div>
      </Section>

      {/* =================================================== */}
      {/* AUTHOR + EDITOR */}
      {/* =================================================== */}

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
            onChange={(
              event
            ) =>
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
                  {author.name}
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
            onChange={(
              event
            ) =>
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
                  {editor.name}
                </option>
              )
            )}
          </select>
        </Field>
      </Section>

      {/* =================================================== */}
      {/* CATEGORIES */}
      {/* =================================================== */}

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
            onChange={(
              event
            ) =>
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
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-white p-2">
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
                    rounded-md
                    px-1
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

      {/* =================================================== */}
      {/* TAGS */}
      {/* =================================================== */}

      <Section
        title={
          dict.story.tags
        }
      >
        <input
          type="search"
          value={
            tagSearch
          }
          onChange={(
            event
          ) =>
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
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border bg-white">
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
                      + {tag.name}
                    </button>
                  )
                )}
            </div>
          )}

        {tags.length > 0 && (
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

      {/* =================================================== */}
      {/* ISLAND */}
      {/* =================================================== */}

      <Section
        title={
          dict.story.island
        }
      >
        <select
          value={island}
          onChange={(
            event
          ) =>
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
                key={option}
                value={option}
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

      {/* =================================================== */}
      {/* ACCESS */}
      {/* =================================================== */}

      <Section
        title={
          dict.story.access
        }
      >
        <select
          value={
            accessLevel
          }
          onChange={(
            event
          ) =>
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
                key={option}
                value={option}
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

      {/* =================================================== */}
      {/* FEATURED IMAGE */}
      {/* =================================================== */}

      <Section
        title={
          language === 'es'
            ? 'Imagen destacada'
            : 'Featured image'
        }
      >
        {featuredImage ? (
          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-border
              bg-white
            "
          >
            <div
              className="
                relative
                aspect-[16/9]
                overflow-hidden
                bg-surface-subtle
              "
            >
              <img
                src={
                  featuredImage.url
                }
                alt={
                  featuredImage.altText ||
                  ''
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />

              <div
                className="
                  absolute
                  right-2
                  top-2
                  flex
                  items-center
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setMediaPickerOpen(
                      true
                    )
                  }
                  className="
                    inline-flex
                    h-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-black/10
                    bg-white/95
                    px-3
                    text-xs
                    font-semibold
                    text-foreground
                    shadow-sm
                    backdrop-blur
                    transition
                    hover:bg-white
                  "
                >
                  {language ===
                  'es'
                    ? 'Cambiar'
                    : 'Change'}
                </button>

                <button
                  type="button"
                  onClick={
                    removeFeaturedImage
                  }
                  aria-label={
                    language ===
                    'es'
                      ? 'Eliminar imagen destacada'
                      : 'Remove featured image'
                  }
                  title={
                    language ===
                    'es'
                      ? 'Eliminar imagen'
                      : 'Remove image'
                  }
                  className="
                    inline-flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-black/10
                    bg-white/95
                    text-muted-foreground
                    shadow-sm
                    backdrop-blur
                    transition
                    hover:text-breaking
                  "
                >
                  <X
                    className="h-4 w-4"
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-foreground
                  "
                >
                  {featuredImage.title ||
                    featuredImage.fileName}
                </p>

                {(featuredImage.description ||
                  featuredImage.caption) && (
                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-muted-foreground
                    "
                  >
                    {featuredImage.description ||
                      featuredImage.caption}
                  </p>
                )}

                {(featuredImage.credit ||
                  featuredImage.photographer ||
                  featuredImage.creatorName) && (
                  <p
                    className="
                      mt-1
                      text-[11px]
                      font-medium
                      text-muted-foreground
                    "
                  >
                    {featuredImage.credit ||
                      featuredImage.photographer ||
                      featuredImage.creatorName}
                  </p>
                )}
              </div>

              <div
                className="
                  border-t
                  border-border
                  pt-4
                "
              >
                <Field
                  label={
                    language ===
                    'es'
                      ? 'Descripción / pie de foto'
                      : 'Description / caption'
                  }
                  hint={
                    language ===
                    'es'
                      ? 'Se completa automáticamente desde la Biblioteca de Medios cuando eliges una imagen. Puedes editarlo para esta historia.'
                      : 'Automatically populated from the Media Library when you select an image. You can customize it for this story.'
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
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder={
                      language ===
                      'es'
                        ? 'Describe la imagen'
                        : 'Describe the image'
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
                      leading-5
                      text-foreground
                      placeholder:text-muted-foreground/60
                      focus:border-primary
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                    "
                  />
                </Field>

                <div className="mt-4">
                  <Field
                    label={
                      language ===
                      'es'
                        ? 'Crédito'
                        : 'Credit'
                    }
                    hint={
                      language ===
                      'es'
                        ? 'También se completa automáticamente desde la Biblioteca de Medios.'
                        : 'Also populated automatically from the Media Library.'
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
                          event.target
                            .value
                        )
                      }
                      placeholder={
                        language ===
                        'es'
                          ? 'Crédito de la imagen'
                          : 'Image credit'
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
                        placeholder:text-muted-foreground/60
                        focus:border-primary
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                      "
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
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
              flex-col
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-border
              bg-surface-muted/40
              px-4
              py-8
              text-center
              transition
              hover:border-primary/40
              hover:bg-primary/5
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-white
                text-muted-foreground
                shadow-sm
              "
            >
              <span className="text-lg">
                +
              </span>
            </div>

            <p
              className="
                mt-3
                text-sm
                font-semibold
                text-foreground
              "
            >
              {language ===
              'es'
                ? 'Seleccionar imagen'
                : 'Select image'}
            </p>

            <p
              className="
                mt-1
                max-w-xs
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              {language ===
              'es'
                ? 'Elige una imagen de la Biblioteca de Medios.'
                : 'Choose an image from the Media Library.'}
            </p>
          </button>
        )}
      </Section>

      {/* =================================================== */}
      {/* SEO */}
      {/* =================================================== */}

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
            onChange={(
              event
            ) =>
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
            value={seoTitle}
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
            onChange={(
              event
            ) =>
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

      {/* =================================================== */}
      {/* SLUG */}
      {/* =================================================== */}

      <Section
        title={
          dict.story.slug
        }
      >
        <input
          type="text"
          value={slug}
          onChange={(
            event
          ) =>
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

      {/* =================================================== */}
      {/* VERSION HISTORY */}
      {/* =================================================== */}

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

/* ========================================================= */
/* SECTION */
/* ========================================================= */

function Section({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-lg
        border
        border-border
        bg-white
        p-3
      "
    >
      <h3
        className="
          mb-3
          text-[0.6875rem]
          font-bold
          uppercase
          tracking-[0.14em]
          text-deep
        "
      >
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/* ========================================================= */
/* FIELD */
/* ========================================================= */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children:
    React.ReactNode;
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

/* ========================================================= */
/* CHARACTER COUNT */
/* ========================================================= */

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