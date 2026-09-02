'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  X,
} from 'lucide-react';

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

import {
  useStoryEditorState,
} from '@/components/editorial/story-editor/useStoryEditorState';

import {
  useStoryMedia,
} from '@/components/editorial/story-editor/useStoryMedia';

import {
  useStoryRevision,
} from '@/components/editorial/story-editor/useStoryRevision';

import {
  useStoryTaxonomy,
} from '@/components/editorial/story-editor/useStoryTaxonomy';

import {
  useStoryWorkflow,
} from '@/components/editorial/story-editor/useStoryWorkflow';

import type {
  StoryEditorProps,
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
  const router =
    useRouter();

  // ==================================================
  // Permissions / story mode
  // ==================================================

  const userIsEditor =
    user.profile?.isEditor ??
    false;

  const userIsAuthor =
    user.profile?.isAuthor ??
    false;

  /**
   * This never changes while the editor is open.
   *
   * A published story keeps its live version in
   * public.stories while edits are saved separately
   * in story_revisions.
   */
  const isPublishedStory =
    story.status ===
    'published';

  const slugLocked =
    isPublishedStory &&
    !userIsEditor;

  // ==================================================
  // Interface state
  // ==================================================

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

  // ==================================================
  // Taxonomy
  // ==================================================

  const taxonomy =
    useStoryTaxonomy({
      initialCategoryIds:
        story.categories.map(
          (category) =>
            category.id
        ),

      initialPrimaryCategoryId:
        story.primaryCategory
          ?.id ?? null,

      initialTags:
        story.tags,
    });

  // ==================================================
  // Featured media
  // ==================================================

  const media =
    useStoryMedia({
      initialFeaturedImage:
        story.featuredImage,

      initialImageCaption:
        story.imageCaption ??
        '',

      initialImageCredit:
        story.imageCredit ??
        '',
    });

  // ==================================================
  // Main editable state
  // ==================================================

  const editor =
    useStoryEditorState({
      story,

      selectedCategoryIds:
        taxonomy
          .selectedCategoryIds,

      tagIds:
        taxonomy.tagIds,

      featuredImageId:
        media.featuredImageId,

      imageCaption:
        media.imageCaption,

      imageCredit:
        media.imageCredit,

      primaryCategoryId:
        taxonomy
          .primaryCategoryId,
    });

  // ==================================================
  // Autosave
  // ==================================================

  const autosave =
    useStoryAutosave({
      storyId:
        story.id,

      payload:
        editor.savePayload,

      errorMessage:
        dict.common
          .errorDesc,

      /**
       * Published stories never autosave directly
       * into their live stories row.
       */
      saveEndpoint:
        isPublishedStory
          ? `/api/stories/${story.id}/revision`
          : undefined,
    });

  // ==================================================
  // Stable revision adapters
  // ==================================================
  //
  // useStoryRevision performs an initial effect.
  // These adapter objects must remain stable so that
  // effect does not continuously reload the revision.
  // ==================================================

  const revisionState =
    useMemo(
      () => ({
        setHeadline:
          editor.setHeadline,

        setSubheadline:
          editor.setSubheadline,

        setSummary:
          editor.setSummary,

        setBody:
          editor.setBody,

        setLanguage:
          editor.setLanguage,

        setAccessLevel:
          editor.setAccessLevel,

        setAuthorId:
          editor.setAuthorId,

        setEditorId:
          editor.setEditorId,

        setIsland:
          editor.setIsland,

        setSlug:
          editor.setSlug,

        setSeoTitle:
          editor.setSeoTitle,

        setSeoDescription:
          editor.setSeoDescription,

        setOriginallyPublishedAt:
          editor
            .setOriginallyPublishedAt,

        setScheduledAt:
          editor.setScheduledAt,
      }),
      [
        editor.setHeadline,
        editor.setSubheadline,
        editor.setSummary,
        editor.setBody,
        editor.setLanguage,
        editor.setAccessLevel,
        editor.setAuthorId,
        editor.setEditorId,
        editor.setIsland,
        editor.setSlug,
        editor.setSeoTitle,
        editor.setSeoDescription,
        editor
          .setOriginallyPublishedAt,
        editor.setScheduledAt,
      ]
    );

  const revisionTaxonomy =
    useMemo(
      () => ({
        setPrimaryCategoryId:
          taxonomy
            .setPrimaryCategoryId,

        setSelectedCategoryIds:
          taxonomy
            .setSelectedCategoryIds,

        setTagIds:
          taxonomy.setTagIds,
      }),
      [
        taxonomy
          .setPrimaryCategoryId,
        taxonomy
          .setSelectedCategoryIds,
        taxonomy.setTagIds,
      ]
    );

  /**
   * useStoryMedia currently exposes a normal function
   * for loadRevisionMedia, so keep the latest function
   * in a ref while giving useStoryRevision a stable
   * adapter object.
   */
  const loadRevisionMediaRef =
    useRef(
      media.loadRevisionMedia
    );

  useEffect(() => {
    loadRevisionMediaRef.current =
      media.loadRevisionMedia;
  }, [
    media.loadRevisionMedia,
  ]);

  const revisionMedia =
    useMemo(
      () => ({
        loadRevisionMedia:
          (
            options: Parameters<
              typeof media.loadRevisionMedia
            >[0]
          ) => {
            loadRevisionMediaRef.current(
              options
            );
          },
      }),
      []
    );

  // ==================================================
  // Revision lifecycle
  // ==================================================

  const revision =
    useStoryRevision({
      story,

      dict,

      isPublishedStory,

      state:
        revisionState,

      taxonomy:
        revisionTaxonomy,

      media:
        revisionMedia,

      onError:
        setWorkflowError,
    });

  /**
   * As soon as a published story changes, there are
   * effectively unpublished changes even if the
   * debounce request has not completed yet.
   */
  useEffect(() => {
    if (
      !isPublishedStory
    ) {
      return;
    }

    if (
      autosave.saveState ===
        'unsaved' ||
      autosave.saveState ===
        'saving'
    ) {
      revision
        .markRevisionPending();
    }
  }, [
    autosave.saveState,
    isPublishedStory,
    revision
      .markRevisionPending,
  ]);

  // ==================================================
  // Workflow
  // ==================================================

  const workflow =
    useStoryWorkflow({
      storyId:
        story.id,

      dict,

      router,

      isPublishedStory,

      savePayload:
        editor.savePayload,

      flushSave:
        autosave.flushSave,

      resetSavedState:
        autosave
          .resetSavedState,

      setStatus:
        editor.setStatus,

      setWorkflowError,

      markRevisionPending:
        revision
          .markRevisionPending,

      discardRevision:
        revision
          .discardRevision,

      clearPendingRevision:
        revision
          .clearPendingRevision,
    });

  // ==================================================
  // Shared settings props
  // ==================================================

  const settingsProps = {
    dict,

    locale,

    language:
      editor.language,

    status:
      editor.status,

    accessLevel:
      editor.accessLevel,

    authorId:
      editor.authorId,

    editorId:
      editor.editorId,

    primaryCategoryId:
      taxonomy
        .primaryCategoryId,

    selectedCategoryIds:
      taxonomy
        .selectedCategoryIds,

    tags:
      taxonomy.tags,

    allTags:
      taxonomy.allTags,

    tagSearch:
      taxonomy.tagSearch,

    island:
      editor.island,

    featuredImage:
      media.featuredImage,

    imageCaption:
      media.imageCaption,

    imageCredit:
      media.imageCredit,

    seoTitle:
      editor.seoTitle,

    seoDescription:
      editor.seoDescription,

    slug:
      editor.slug,

    slugLocked,

    originallyPublishedAt:
      editor
        .originallyPublishedAt,

    /**
     * This remains display-only.
     *
     * Actual West Island Times publication time is
     * controlled by the server.
     */
    publishedAt:
      editor.publishedAt,

    scheduledAt:
      editor.scheduledAt,

    versions,

    userIsEditor,

    categories,

    authors,

    editors,

    setLanguage:
      editor.setLanguage,

    setAccessLevel:
      editor.setAccessLevel,

    setAuthorId:
      editor.setAuthorId,

    setEditorId:
      editor.setEditorId,

    setPrimaryCategoryId:
      taxonomy
        .setPrimaryCategoryId,

    setIsland:
      editor.setIsland,

    setSlug:
      editor.setSlug,

    setOriginallyPublishedAt:
      editor.setOriginallyPublishedAt,

    setScheduledAt:
      editor.setScheduledAt,

    setImageCaption:
      media.setImageCaption,

    setImageCredit:
      media.setImageCredit,

    setSeoTitle:
      editor.setSeoTitle,

    setSeoDescription:
      editor.setSeoDescription,

    toggleCategory:
      taxonomy
        .toggleCategory,

    toggleTag:
      taxonomy.toggleTag,

    searchTags:
      taxonomy.searchTags,

    createTag:
      taxonomy.createTag,

    setFeaturedImage:
      media
        .setStoryFeaturedImage,

    setMediaPickerOpen:
      media
        .setMediaPickerOpen,

    handleRestoreVersion:
      workflow
        .handleRestoreVersion,
  };

  // ==================================================
  // Errors
  // ==================================================

  const error =
    autosave.error ??
    workflowError;

  // ==================================================
  // Initial revision loading
  // ==================================================

  if (
    !revision
      .revisionLoaded
  ) {
    return (
      <div
        className="
          flex
          h-full
          items-center
          justify-center
          bg-white
        "
      >
        <div className="text-sm text-muted-foreground">
          {locale === 'es'
            ? 'Cargando cambios…'
            : 'Loading changes…'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ==================================================
          Editor header
      ================================================== */}

      <StoryEditorHeader
        dict={
          dict
        }
        locale={
          locale
        }
        status={
          editor.status
        }
        saveState={
          autosave.saveState
        }
        isSaving={
          autosave.isSaving
        }
        userIsAuthor={
          userIsAuthor
        }
        userIsEditor={
          userIsEditor
        }
        isPublishedStory={
          isPublishedStory
        }
        hasPendingRevision={
          revision
            .hasPendingRevision
        }
        onBackToStories={() => {
          void workflow
            .handleBackToStories();
        }}
        onPreview={() => {
          void workflow
            .handlePreview();
        }}
        onSave={() => {
          void autosave
            .saveNow();
        }}
        onSubmitReview={() => {
          void workflow
            .handleSubmitReview();
        }}
        onPublish={() => {
          void workflow
            .handlePublish();
        }}
        onPublishUpdate={() => {
          void workflow
            .handlePublishUpdate();
        }}
        onRevertChanges={() => {
          void workflow
            .handleRevertChanges();
        }}
        onReturnToDraft={() => {
          void workflow
            .handleReturnToDraft();
        }}
        onArchive={() => {
          void workflow
            .handleArchive();
        }}
      />

      {/* ==================================================
          Error banner
      ================================================== */}

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

      {/* ==================================================
          Main editor
      ================================================== */}

      <div className="flex flex-1 overflow-hidden">
        <StoryEditorContent
          dict={
            dict
          }
          language={
            editor.language
          }
          userId={
            user.id
          }
          headline={
            editor.headline
          }
          subheadline={
            editor.subheadline
          }
          summary={
            editor.summary
          }
          body={
            editor.body
          }
          isSaving={
            autosave.isSaving
          }
          setHeadline={
            editor.setHeadline
          }
          setSubheadline={
            editor
              .setSubheadline
          }
          setSummary={
            editor.setSummary
          }
          setBody={
            editor.setBody
          }
          onSaveVersion={() => {
            void autosave
              .saveVersion();
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

      {/* ==================================================
          Mobile settings trigger
      ================================================== */}

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
          rounded-lg
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
        {locale === 'es'
          ? 'Ajustes'
          : 'Settings'}
      </button>

      {/* ==================================================
          Mobile settings drawer
      ================================================== */}

      {mobileSettingsOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            lg:hidden
          "
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
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-border
                bg-white
                px-4
                py-3
              "
            >
              <span className="font-semibold text-deep">
                {locale === 'es'
                  ? 'Ajustes'
                  : 'Settings'}
              </span>

              <button
                type="button"
                onClick={() =>
                  setMobileSettingsOpen(
                    false
                  )
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-foreground
                  transition-colors
                  hover:bg-surface-muted
                "
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

      {/* ==================================================
          Featured image picker
      ================================================== */}

      {media.mediaPickerOpen && (
        <MediaPicker
          dict={
            dict
          }
          userId={
            user.id
          }
          onSelect={(
            selectedMedia
          ) => {
            media
              .selectFeaturedImage(
                selectedMedia
              );
          }}
          onClose={() =>
            media
              .setMediaPickerOpen(
                false
              )
          }
        />
      )}
    </div>
  );
}