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

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

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

  /* ======================================================= */
  /* PERMISSIONS / STORY MODE */
  /* ======================================================= */

  const userIsEditor =
    user.profile?.isEditor ??
    false;

  const userIsAuthor =
    user.profile?.isAuthor ??
    false;

  /**
   * This value never changes while this editor instance
   * is open.
   *
   * Published stories keep the live version in stories
   * while edits are stored through the revision workflow.
   */
  const isPublishedStory =
    story.status ===
    'published';

  const slugLocked =
    isPublishedStory &&
    !userIsEditor;

  /* ======================================================= */
  /* INTERFACE STATE */
  /* ======================================================= */

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

  /* ======================================================= */
  /* TAXONOMY */
  /* ======================================================= */

  const taxonomy =
    useStoryTaxonomy({
      initialCategoryIds:
        story.categories.map(
          (category) =>
            category.id
        ),

      initialPrimaryCategoryId:
        story.primaryCategory
          ?.id ??
        null,

      initialTags:
        story.tags,
    });

  /* ======================================================= */
  /* FEATURED MEDIA */
  /* ======================================================= */

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

  /* ======================================================= */
  /* MAIN EDITABLE STATE */
  /* ======================================================= */

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

  /* ======================================================= */
  /* AUTOSAVE */
  /* ======================================================= */

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
       * Published stories never autosave directly into
       * their live stories row.
       */
      saveEndpoint:
        isPublishedStory
          ? `/api/stories/${story.id}/revision`
          : undefined,
    });

  /* ======================================================= */
  /* STABLE REVISION ADAPTERS */
  /* ======================================================= */

  const revisionState =
    useMemo(
      () => ({
        setHeadline:
          editor.setHeadline,

        setShortTitle:
          editor.setShortTitle,

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
        editor.setShortTitle,
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
   * Keep the latest media revision loader in a ref while
   * exposing a stable object to useStoryRevision.
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

  /* ======================================================= */
  /* REVISION LIFECYCLE */
  /* ======================================================= */

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
   * A changed published story effectively has unpublished
   * changes as soon as autosave enters unsaved/saving.
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

  /* ======================================================= */
  /* WORKFLOW */
  /* ======================================================= */

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

  /* ======================================================= */
  /* SHARED SETTINGS PROPS */
  /* ======================================================= */

  const settingsProps = {
    dict,

    locale,

    language:
      editor.language,

    status:
      editor.status,

    accessLevel:
      editor.accessLevel,

    shortTitle:
      editor.shortTitle,

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
     * Display-only.
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

    /* ----------------------------------------------------- */
    /* Setters */
    /* ----------------------------------------------------- */

    setLanguage:
      editor.setLanguage,

    setAccessLevel:
      editor.setAccessLevel,

    setShortTitle:
      editor.setShortTitle,

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
      editor
        .setOriginallyPublishedAt,

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

    removeFeaturedImage:
      media
        .removeFeaturedImage,

    setMediaPickerOpen:
      media
        .setMediaPickerOpen,

    handleRestoreVersion:
      workflow
        .handleRestoreVersion,
  };

  /* ======================================================= */
  /* ERRORS */
  /* ======================================================= */

  const error =
    autosave.error ??
    workflowError;

  /* ======================================================= */
  /* INITIAL REVISION LOADING */
  /* ======================================================= */

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
        <div
          className="
            text-sm
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Cargando cambios…'
            : 'Loading changes…'}
        </div>
      </div>
    );
  }

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      className="
        flex
        h-full
        flex-col
      "
    >
      {/* =================================================== */}
      {/* EDITOR HEADER */}
      {/* =================================================== */}

      <StoryEditorHeader
        dict={dict}
        locale={locale}
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

      {/* =================================================== */}
      {/* ERROR BANNER */}
      {/* =================================================== */}

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

      {/* =================================================== */}
      {/* MAIN EDITOR */}
      {/* =================================================== */}

      <div
        className="
          flex
          min-h-0
          flex-1
          overflow-hidden
        "
      >
        <StoryEditorContent
          dict={dict}
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

        {/* ================================================= */}
        {/* DESKTOP SETTINGS */}
        {/* ================================================= */}

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

      {/* =================================================== */}
      {/* MOBILE SETTINGS TRIGGER */}
      {/* =================================================== */}

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

      {/* =================================================== */}
      {/* MOBILE SETTINGS DRAWER */}
      {/* =================================================== */}

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
            className="
              absolute
              inset-0
              bg-deep/60
            "
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
              <span
                className="
                  font-semibold
                  text-deep
                "
              >
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
                  className="
                    h-5
                    w-5
                  "
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

      {/* =================================================== */}
      {/* FEATURED IMAGE PICKER */}
      {/* =================================================== */}

      {media.mediaPickerOpen && (
        <MediaPicker
          dict={dict}
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