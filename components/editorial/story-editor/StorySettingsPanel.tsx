'use client';

import { X } from 'lucide-react';

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

export function StorySettingsPanel({
  dict,
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
  publishedAt,
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
  setPublishedAt,
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

  return (
    <div className="space-y-6 p-4">
      {/* Publication */}
      <Section title={dict.story.publication}>
        <Field label={dict.story.status}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-border bg-white px-2 py-1 text-xs text-[#00c113] font-semibold uppercase tracking-wide">
              {status}
            </span>
          </div>
        </Field>

        {publishedAt && (
          <Field label={dict.story.publishedDate}>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(event) =>
                setPublishedAt(
                  event.target.value
                )
              }
              disabled={!userIsEditor}
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
                disabled:text-muted-foreground
              "
            />
          </Field>
        )}
      </Section>

      {/* Language */}
      <Section title={dict.story.language}>
        <div className="flex gap-2">
          {(['en', 'es'] as StoryLanguage[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setLanguage(item)
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
                  language === item
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-white text-foreground hover:bg-surface-muted'
                )}
              >
                {item === 'en'
                  ? dict.common.languageEN
                  : dict.common.languageES}
              </button>
            )
          )}
        </div>
      </Section>

      {/* Author & Editor */}
      <Section title={dict.story.author}>
        <Field label={dict.story.author}>
          <select
            value={authorId ?? ''}
            onChange={(event) =>
              setAuthorId(
                event.target.value || null
              )
            }
            disabled={!userIsEditor}
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
              {dict.story.selectAuthor}
            </option>

            {authors.map((author) => (
              <option
                key={author.id}
                value={author.id}
              >
                {author.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={dict.story.editor}>
          <select
            value={editorId ?? ''}
            onChange={(event) =>
              setEditorId(
                event.target.value || null
              )
            }
            disabled={!userIsEditor}
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
              {dict.story.selectEditor}
            </option>

            {editors.map((editor) => (
              <option
                key={editor.id}
                value={editor.id}
              >
                {editor.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Categories */}
      <Section
        title={dict.story.primaryCategory}
      >
        <Field
          label={dict.story.primaryCategory}
        >
          <select
            value={primaryCategoryId ?? ''}
            onChange={(event) =>
              setPrimaryCategoryId(
                event.target.value || null
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
              {dict.story.selectCategory}
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {language === 'es'
                  ? category.nameEs
                  : category.nameEn}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={
            dict.story.additionalCategories
          }
        >
          <div className="max-h-40 overflow-y-auto border border-border bg-white p-2">
            {categories.map((category) => (
              <label
                key={category.id}
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
                  {language === 'es'
                    ? category.nameEs
                    : category.nameEn}
                </span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      {/* Tags */}
      <Section title={dict.story.tags}>
        <input
          type="search"
          value={tagSearch}
          onChange={(event) =>
            searchTags(
              event.target.value
            )
          }
          placeholder={dict.story.searchTags}
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

        {tagSearch.trim().length >= 2 &&
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
              + {dict.story.createTag}:{' '}
              &ldquo;{tagSearch.trim()}&rdquo;
            </button>
          )}

        {tagSearch.trim().length >= 2 &&
          allTags.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto border border-border bg-white">
              {allTags
                .filter(
                  (tag) =>
                    !tags.find(
                      (selectedTag) =>
                        selectedTag.id ===
                        tag.id
                    )
                )
                .slice(0, 10)
                .map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      toggleTag(tag.id)
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
                ))}
            </div>
          )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  toggleTag(tag.id)
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
            ))}
          </div>
        )}
      </Section>

      {/* Island */}
      <Section title={dict.story.island}>
        <select
          value={island}
          onChange={(event) =>
            setIsland(
              event.target.value as IslandScope
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
          {islandOptions.map((option) => (
            <option
              key={option}
              value={option}
            >
              {islandLabel(
                option,
                language
              )}
            </option>
          ))}
        </select>
      </Section>

      {/* Access */}
      <Section title={dict.story.access}>
        <select
          value={accessLevel}
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
          {accessOptions.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option === 'public'
                ? dict.story.publicAccess
                : option === 'registered'
                  ? dict.story
                      .registeredAccess
                  : option === 'subscriber'
                    ? dict.story
                        .subscriberAccess
                    : dict.story
                        .premiumAccess}
            </option>
          ))}
        </select>
      </Section>

      {/* Featured image */}
      <Section
        title={dict.story.featuredImage}
      >
        {featuredImage ? (
          <div>
            <img
              src={featuredImage.url}
              alt={featuredImage.altText}
              className="
                mb-2
                aspect-video
                w-full
                bg-surface-subtle
                object-cover
              "
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMediaPickerOpen(true)
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                {dict.story.selectFromMedia}
              </button>

              <button
                type="button"
                onClick={() =>
                  setFeaturedImage(null)
                }
                className="text-xs font-medium text-breaking hover:underline"
              >
                {dict.story.removeImage}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              setMediaPickerOpen(true)
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
            {dict.story.selectFromMedia}
          </button>
        )}

        {featuredImage && (
          <>
            <Field
              label={dict.story.imageCaption}
            >
              <input
                type="text"
                value={imageCaption}
                onChange={(event) =>
                  setImageCaption(
                    event.target.value
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
                  focus:border-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              />
            </Field>

            <Field
              label={dict.story.imageCredit}
            >
              <input
                type="text"
                value={imageCredit}
                onChange={(event) =>
                  setImageCredit(
                    event.target.value
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
                  focus:border-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              />
            </Field>
          </>
        )}
      </Section>

      {/* SEO */}
      <Section title="SEO">
        <Field
          label={dict.story.seoTitle}
          hint={dict.story.seoTitleHint}
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
            value={seoTitle}
            target={60}
          />
        </Field>

        <Field
          label={
            dict.story.seoDescription
          }
          hint={
            dict.story
              .seoDescriptionHint
          }
        >
          <textarea
            value={seoDescription}
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
            value={seoDescription}
            target={160}
          />
        </Field>
      </Section>

      {/* Slug */}
      <Section title={dict.story.slug}>
        <input
          type="text"
          value={slug}
          onChange={(event) =>
            setSlug(
              event.target.value
            )
          }
          disabled={slugLocked}
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
            {dict.story.slugLocked}
          </p>
        )}
      </Section>

      {/* Version history */}
      <Section
        title={dict.story.versionHistory}
      >
        <StoryVersionHistory
          dict={dict}
          versions={versions}
          canRestore={userIsEditor}
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
  const length = value.length;

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