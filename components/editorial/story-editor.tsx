'use client';

import {
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

import type {
  AccessLevel,
  IslandScope,
  StoryLanguage,
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaPicker,
} from '@/components/editorial/media-picker';

import {
  StoryEditorContent,
} from '@/components/editorial/story-editor/StoryEditorContent';

import {
  StoryEditorHeader,
} from '@/components/editorial/story-editor/StoryEditorHeader';

import {
  StorySettingsPanel,
} from '@/components/editorial/story-editor/StorySettingsPanel';

import {
  useStoryAutosave,
} from '@/components/editorial/story-editor/useStoryAutosave';

import type {
  StoryEditorProps,
  StorySavePayload,
} from '@/components/editorial/story-editor/types';

export function StoryEditor({
  dict,
  locale,
  story,
  user,
  categories,
  authors,
  editors,
  versions,
}: StoryEditorProps) {
  const router = useRouter();

  const userIsEditor =
    user.profile?.isEditor ??
    false;

  const userIsAuthor =
    user.profile?.isAuthor ??
    false;

  const slugLocked =
    story.status ===
      'published' &&
    !userIsEditor;

  // --------------------------------------------------
  // Story state
  // --------------------------------------------------

  const [
    headline,
    setHeadline,
  ] = useState(
    story.headline
  );

  const [
    subheadline,
    setSubheadline,
  ] = useState(
    story.subheadline ?? ''
  );

  const [
    summary,
    setSummary,
  ] = useState(
    story.summary ?? ''
  );

  const [
    body,
    setBody,
  ] = useState<
    Record<string, unknown>
  >(story.body);

  const [
    language,
    setLanguage,
  ] = useState<StoryLanguage>(
    story.language
  );

  const [
    status,
    setStatus,
  ] = useState<StoryStatus>(
    story.status
  );

  const [
    accessLevel,
    setAccessLevel,
  ] = useState<AccessLevel>(
    story.accessLevel
  );

  const [
    authorId,
    setAuthorId,
  ] = useState<
    string | null
  >(
    story.author?.id ??
      null
  );

  const [
    editorId,
    setEditorId,
  ] = useState<
    string | null
  >(
    story.editor?.id ??
      null
  );

  const [
    primaryCategoryId,
    setPrimaryCategoryId,
  ] = useState<
    string | null
  >(
    story.primaryCategory
      ?.id ?? null
  );

  const [
    selectedCategoryIds,
    setSelectedCategoryIds,
  ] = useState<
    string[]
  >(
    story.categories.map(
      (category) =>
        category.id
    )
  );

  const [
    tagIds,
    setTagIds,
  ] = useState<
    string[]
  >(
    story.tags.map(
      (tag) => tag.id
    )
  );

  const [
    tags,
    setTags,
  ] = useState(
    story.tags
  );

  const [
    allTags,
    setAllTags,
  ] = useState(
    story.tags
  );

  const [
    tagSearch,
    setTagSearch,
  ] = useState('');

  const [
    island,
    setIsland,
  ] = useState<IslandScope>(
    story.island
  );

  const [
    featuredImage,
    setFeaturedImage,
  ] = useState<
    MediaAsset | null
  >(
    story.featuredImage
  );

  const [
    imageCaption,
    setImageCaption,
  ] = useState(
    story.imageCaption ??
      ''
  );

  const [
    imageCredit,
    setImageCredit,
  ] = useState(
    story.imageCredit ??
      ''
  );

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    story.seoTitle ?? ''
  );

  const [
    seoDescription,
    setSeoDescription,
  ] = useState(
    story.seoDescription ??
      ''
  );

  const [
    slug,
    setSlug,
  ] = useState(
    story.slug
  );

  const [
    originallyPublishedAt,
    setOriginallyPublishedAt,
  ] = useState(
    story.originallyPublishedAt
      ? story.originallyPublishedAt.slice(
          0,
          16
        )
      : ''
  );

  const [
    publishedAt,
    setPublishedAt,
  ] = useState(
    story.publishedAt
      ? story.publishedAt.slice(
          0,
          16
        )
      : ''
  );

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState(
    story.scheduledAt
      ? story.scheduledAt.slice(
          0,
          16
        )
      : ''
  );

  // --------------------------------------------------
  // Interface state
  // --------------------------------------------------

  const [
    mediaPickerOpen,
    setMediaPickerOpen,
  ] = useState(false);

  const [
    mobileSettingsOpen,
    setMobileSettingsOpen,
  ] = useState(false);

  const [
    workflowError,
    setWorkflowError,
  ] = useState<
    string | null
  >(null);

  // --------------------------------------------------
  // Save payload
  // --------------------------------------------------

  const savePayload =
    useMemo<StorySavePayload>(
      () => ({
        headline,

        subheadline:
          subheadline ||
          null,

        summary:
          summary || null,

        body,

        language,
        status,
        accessLevel,

        authorId,
        editorId,

        primaryCategoryId,

        island,

        featuredImageId:
          featuredImage?.id ??
          null,

        imageCaption:
          imageCaption ||
          null,

        imageCredit:
          imageCredit ||
          null,

        seoTitle:
          seoTitle || null,

        seoDescription:
          seoDescription ||
          null,

        slug,

        originallyPublishedAt:
          originallyPublishedAt ||
          null,

        publishedAt:
          publishedAt || null,

        scheduledAt:
          scheduledAt || null,

        categoryIds:
          selectedCategoryIds,

        tagIds,

        createVersion: false,
      }),
      [
        headline,
        subheadline,
        summary,
        body,
        language,
        status,
        accessLevel,
        authorId,
        editorId,
        primaryCategoryId,
        island,
        featuredImage,
        imageCaption,
        imageCredit,
        seoTitle,
        seoDescription,
        slug,
        originallyPublishedAt,
        publishedAt,
        scheduledAt,
        selectedCategoryIds,
        tagIds,
      ]
    );

  // --------------------------------------------------
  // Autosave
  // --------------------------------------------------

  const {
    saveState,
    isSaving,
    error: autosaveError,
    saveNow,
    saveVersion,
    flushSave,
  } = useStoryAutosave({
    storyId: story.id,
    payload: savePayload,
    errorMessage:
      dict.common.errorDesc,
  });

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  async function handlePreview() {
    const saved =
      await flushSave();

    if (!saved) {
      return;
    }

    router.push(
      `/newsroom/stories/${story.id}/preview`
    );
  }

  async function handleBackToStories() {
    const saved =
      await flushSave();

    if (!saved) {
      return;
    }

    router.push(
      '/newsroom/stories'
    );
  }

  // --------------------------------------------------
  // Workflow
  // --------------------------------------------------

  async function changeStatus(
    nextStatus: StoryStatus,
    createVersion = false
  ) {
    setWorkflowError(null);

    const flushed =
      await flushSave();

    if (!flushed) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/stories/${story.id}`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              ...savePayload,

              status:
                nextStatus,

              createVersion,
            }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data.error ??
            'Unable to update story status'
        );
      }

      setStatus(
        nextStatus
      );

      router.refresh();
    } catch (
      workflowSaveError
    ) {
      console.error(
        'Story workflow update failed:',
        workflowSaveError
      );

      setWorkflowError(
        workflowSaveError instanceof
          Error
          ? workflowSaveError.message
          : dict.common.errorDesc
      );
    }
  }

  async function handleSubmitReview() {
    await changeStatus(
      'in_review',
      true
    );
  }

  async function handlePublish() {
    await changeStatus(
      'published',
      true
    );
  }

  async function handleReturnToDraft() {
    await changeStatus(
      'draft'
    );
  }

  async function handleArchive() {
    await changeStatus(
      'archived'
    );
  }

  // --------------------------------------------------
  // Version restore
  // --------------------------------------------------

  async function handleRestoreVersion(
    versionId: string
  ) {
    const confirmed =
      window.confirm(
        dict.story
          .restoreConfirm
      );

    if (!confirmed) {
      return;
    }

    const saved =
      await flushSave();

    if (!saved) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/stories/${story.id}/restore`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              versionId,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          'Unable to restore version'
        );
      }

      window.location.reload();
    } catch (
      restoreError
    ) {
      console.error(
        'Version restore failed:',
        restoreError
      );

      setWorkflowError(
        dict.common.errorDesc
      );
    }
  }

  // --------------------------------------------------
  // Categories
  // --------------------------------------------------

  function toggleCategory(
    categoryId: string
  ) {
    setSelectedCategoryIds(
      (current) => {
        if (
          current.includes(
            categoryId
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              categoryId
          );
        }

        return [
          ...current,
          categoryId,
        ];
      }
    );

    if (
      primaryCategoryId ===
      categoryId
    ) {
      setPrimaryCategoryId(
        null
      );
    }
  }

  // --------------------------------------------------
  // Tags
  // --------------------------------------------------

  async function searchTags(
    query: string
  ) {
    setTagSearch(query);

    if (
      query.trim().length <
      2
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/tags?search=${encodeURIComponent(
            query
          )}`
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      setAllTags(
        data.tags ?? []
      );
    } catch (
      searchError
    ) {
      console.error(
        'Tag search failed:',
        searchError
      );
    }
  }

  function toggleTag(
    tagId: string
  ) {
    const alreadySelected =
      tagIds.includes(
        tagId
      );

    if (
      alreadySelected
    ) {
      setTagIds(
        (current) =>
          current.filter(
            (id) =>
              id !== tagId
          )
      );

      setTags(
        (current) =>
          current.filter(
            (tag) =>
              tag.id !==
              tagId
          )
      );

      return;
    }

    setTagIds(
      (current) => [
        ...current,
        tagId,
      ]
    );

    const tag =
      allTags.find(
        (item) =>
          item.id === tagId
      );

    if (!tag) {
      return;
    }

    setTags(
      (current) => {
        if (
          current.some(
            (item) =>
              item.id ===
              tag.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          tag,
        ];
      }
    );
  }

  async function createTag(
    name: string
  ) {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      const response =
        await fetch(
          '/api/tags',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name:
                trimmedName,
            }),
          }
        );

      if (!response.ok) {
        return;
      }

      const tag =
        await response.json();

      setTagIds(
        (current) => {
          if (
            current.includes(
              tag.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            tag.id,
          ];
        }
      );

      setTags(
        (current) => {
          if (
            current.some(
              (item) =>
                item.id ===
                tag.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            tag,
          ];
        }
      );

      setAllTags(
        (current) => {
          if (
            current.some(
              (item) =>
                item.id ===
                tag.id
            )
          ) {
            return current;
          }

          return [
            tag,
            ...current,
          ];
        }
      );

      setTagSearch('');
    } catch (
      createTagError
    ) {
      console.error(
        'Create tag failed:',
        createTagError
      );
    }
  }

  // --------------------------------------------------
  // Shared settings props
  // --------------------------------------------------

  const settingsProps = {
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

    originallyPublishedAt,
    publishedAt,
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
    setPublishedAt,
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
  };

  const error =
    autosaveError ??
    workflowError;

  return (
    <div className="flex h-full flex-col">
      <StoryEditorHeader
        dict={dict}
        locale={locale}
        status={status}
        saveState={
          saveState
        }
        isSaving={
          isSaving
        }
        userIsAuthor={
          userIsAuthor
        }
        userIsEditor={
          userIsEditor
        }
        onBackToStories={
          handleBackToStories
        }
        onPreview={
          handlePreview
        }
        onSave={() => {
          void saveNow();
        }}
        onSubmitReview={() => {
          void handleSubmitReview();
        }}
        onPublish={() => {
          void handlePublish();
        }}
        onReturnToDraft={() => {
          void handleReturnToDraft();
        }}
        onArchive={() => {
          void handleArchive();
        }}
      />

      {error && (
        <div
          role="alert"
          className="
            border-b
            border-breaking/30
            bg-breaking/5
            px-4
            py-2
            text-sm
            text-breaking
          "
        >
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <StoryEditorContent
          dict={dict}
          language={
            language
          }
          userId={user.id}
          headline={
            headline
          }
          subheadline={
            subheadline
          }
          summary={
            summary
          }
          body={body}
          isSaving={
            isSaving
          }
          setHeadline={
            setHeadline
          }
          setSubheadline={
            setSubheadline
          }
          setSummary={
            setSummary
          }
          setBody={
            setBody
          }
          onSaveVersion={() => {
            void saveVersion();
          }}
        />

        {/* Desktop settings */}
        <aside
          className="
            hidden
            w-80
            shrink-0
            overflow-y-auto
            border-l
            border-border
            bg-surface-muted
            lg:block
          "
        >
          <StorySettingsPanel
            {...settingsProps}
          />
        </aside>
      </div>

      {/* Mobile settings button */}
      <button
        type="button"
        onClick={() =>
          setMobileSettingsOpen(
            true
          )
        }
        className="
          fixed
          bottom-4
          right-4
          z-30
          inline-flex
          h-12
          items-center
          bg-deep
          px-4
          text-sm
          font-semibold
          text-white
          shadow-lg
          transition-colors
          hover:bg-deep/90
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
          lg:hidden
        "
      >
        Settings
      </button>

      {/* Mobile settings drawer */}
      {mobileSettingsOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() =>
              setMobileSettingsOpen(
                false
              )
            }
            className="absolute inset-0 bg-deep/60"
            aria-label={
              dict.nav.close
            }
          />

          <div
            className="
              absolute
              right-0
              top-0
              h-full
              w-[90%]
              max-w-md
              overflow-y-auto
              bg-surface-muted
              shadow-xl
            "
          >
            <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
              <span className="font-semibold text-deep">
                Settings
              </span>

              <button
                type="button"
                onClick={() =>
                  setMobileSettingsOpen(
                    false
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-surface-muted"
                aria-label={
                  dict.nav.close
                }
              >
                <X
                  className="h-5 w-5"
                  aria-hidden
                />
              </button>
            </div>

            <StorySettingsPanel
              {...settingsProps}
            />
          </div>
        </div>
      )}

      {/* Featured image picker */}
      {mediaPickerOpen && (
        <MediaPicker
          dict={dict}
          userId={
            user.id
          }
          onSelect={(
            media
          ) => {
            setFeaturedImage(
              media
            );

            setMediaPickerOpen(
              false
            );
          }}
          onClose={() =>
            setMediaPickerOpen(
              false
            )
          }
        />
      )}
    </div>
  );
}