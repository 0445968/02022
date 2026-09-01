'use client';

import {
  useCallback,
} from 'react';

import type {
  AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  StorySavePayload,
} from './types';

interface UseStoryWorkflowOptions {
  storyId: string;

  dict: Dictionary;

  router:
    AppRouterInstance;

  isPublishedStory:
    boolean;

  savePayload:
    StorySavePayload;

  flushSave:
    () => Promise<boolean>;

  resetSavedState:
    (
      payload?:
        StorySavePayload
    ) => void;

  setStatus:
    (
      status:
        StoryStatus
    ) => void;

  setWorkflowError:
    (
      message:
        string | null
    ) => void;

  markRevisionPending:
    () => void;

  discardRevision:
    () => Promise<boolean>;

  clearPendingRevision:
    () => void;
}

export function useStoryWorkflow({
  storyId,
  dict,
  router,
  isPublishedStory,
  savePayload,
  flushSave,
  resetSavedState,
  setStatus,
  setWorkflowError,
  markRevisionPending,
  discardRevision,
  clearPendingRevision,
}: UseStoryWorkflowOptions) {
  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const handlePreview =
    useCallback(
      async () => {
        const saved =
          await flushSave();

        if (!saved) {
          return;
        }

        if (
          isPublishedStory
        ) {
          markRevisionPending();
        }

        router.push(
          isPublishedStory
            ? `/newsroom/stories/${storyId}/preview?revision=1`
            : `/newsroom/stories/${storyId}/preview`
        );
      },
      [
        flushSave,
        isPublishedStory,
        markRevisionPending,
        router,
        storyId,
      ]
    );

  const handleBackToStories =
    useCallback(
      async () => {
        const saved =
          await flushSave();

        if (!saved) {
          return;
        }

        router.push(
          '/newsroom/stories'
        );
      },
      [
        flushSave,
        router,
      ]
    );

  // --------------------------------------------------
  // Normal story workflow
  // --------------------------------------------------

  const changeStatus =
    useCallback(
      async (
        nextStatus:
          StoryStatus,

        createVersion =
          false
      ) => {
        setWorkflowError(
          null
        );

        const flushed =
          await flushSave();

        if (!flushed) {
          return false;
        }

        try {
          const response =
            await fetch(
              `/api/stories/${storyId}`,
              {
                method:
                  'PUT',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    ...savePayload,

                    status:
                      nextStatus,

                    createVersion,
                  }),
              }
            );

          if (
            !response.ok
          ) {
            const data =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              data.error ??
                'Unable to update story status'
            );
          }

          setStatus(
            nextStatus
          );

          router.refresh();

          return true;
        } catch (
          workflowError
        ) {
          console.error(
            'Story workflow update failed:',
            workflowError
          );

          setWorkflowError(
            workflowError instanceof
              Error
              ? workflowError.message
              : dict.common
                  .errorDesc
          );

          return false;
        }
      },
      [
        dict.common.errorDesc,
        flushSave,
        router,
        savePayload,
        setStatus,
        setWorkflowError,
        storyId,
      ]
    );

  const handleSubmitReview =
    useCallback(
      async () => {
        await changeStatus(
          'in_review',
          true
        );
      },
      [
        changeStatus,
      ]
    );

  const handleInitialPublish =
    useCallback(
      async () => {
        await changeStatus(
          'published',
          true
        );
      },
      [
        changeStatus,
      ]
    );

  const handleReturnToDraft =
    useCallback(
      async () => {
        await changeStatus(
          'draft'
        );
      },
      [
        changeStatus,
      ]
    );

  const handleArchive =
    useCallback(
      async () => {
        await changeStatus(
          'archived'
        );
      },
      [
        changeStatus,
      ]
    );

  // --------------------------------------------------
  // Published revision workflow
  // --------------------------------------------------

  const handlePublishUpdate =
    useCallback(
      async () => {
        setWorkflowError(
          null
        );

        const saved =
          await flushSave();

        if (!saved) {
          return false;
        }

        try {
          const response =
            await fetch(
              `/api/stories/${storyId}/revision/publish`,
              {
                method:
                  'POST',
              }
            );

          if (
            !response.ok
          ) {
            const data =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              data.error ??
                'Unable to publish update'
            );
          }

          clearPendingRevision();

          resetSavedState(
            savePayload
          );

          /**
           * Reload instead of only router.refresh()
           * so every editor state field is rebuilt
           * from the newly published server version.
           */
          window.location.reload();

          return true;
        } catch (
          publishError
        ) {
          console.error(
            'Publish story update failed:',
            publishError
          );

          setWorkflowError(
            publishError instanceof
              Error
              ? publishError.message
              : dict.common
                  .errorDesc
          );

          return false;
        }
      },
      [
        clearPendingRevision,
        dict.common.errorDesc,
        flushSave,
        resetSavedState,
        savePayload,
        setWorkflowError,
        storyId,
      ]
    );

  const handlePublish =
    useCallback(
      async () => {
        if (
          isPublishedStory
        ) {
          await handlePublishUpdate();

          return;
        }

        await handleInitialPublish();
      },
      [
        handleInitialPublish,
        handlePublishUpdate,
        isPublishedStory,
      ]
    );

  const handleRevertChanges =
    useCallback(
      async () => {
        setWorkflowError(
          null
        );

        const discarded =
          await discardRevision();

        if (!discarded) {
          return false;
        }

        /**
         * Rebuild the entire editor from the
         * untouched published story.
         */
        window.location.reload();

        return true;
      },
      [
        discardRevision,
        setWorkflowError,
      ]
    );

  // --------------------------------------------------
  // Historical version restore
  // --------------------------------------------------

  const handleRestoreVersion =
    useCallback(
      async (
        versionId: string
      ) => {
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
              `/api/stories/${storyId}/restore`,
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    versionId,
                  }),
              }
            );

          if (
            !response.ok
          ) {
            const data =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              data.error ??
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
            restoreError instanceof
              Error
              ? restoreError.message
              : dict.common
                  .errorDesc
          );
        }
      },
      [
        dict.common.errorDesc,
        dict.story.restoreConfirm,
        flushSave,
        setWorkflowError,
        storyId,
      ]
    );

  return {
    handlePreview,
    handleBackToStories,

    changeStatus,

    handleSubmitReview,
    handlePublish,
    handleInitialPublish,
    handlePublishUpdate,
    handleReturnToDraft,
    handleArchive,

    handleRevertChanges,

    handleRestoreVersion,
  };
}