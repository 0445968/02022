'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  SaveState,
  StorySavePayload,
} from './types';

const AUTOSAVE_DELAY = 800;

interface UseStoryAutosaveOptions {
  storyId: string;

  payload: StorySavePayload;

  errorMessage: string;

  /**
   * Published stories save into a private revision.
   * Draft/review stories continue saving directly.
   */
  saveEndpoint?: string;
}

interface UseStoryAutosaveResult {
  saveState: SaveState;

  isSaving: boolean;

  error: string | null;

  saveNow: () => Promise<boolean>;

  saveVersion: () => Promise<boolean>;

  flushSave: () => Promise<boolean>;

  /**
   * Lets the editor reset its baseline after
   * loading or discarding a revision.
   */
  resetSavedState: (
    payload?: StorySavePayload
  ) => void;
}

function serializePayload(
  payload: StorySavePayload
) {
  return JSON.stringify({
    ...payload,

    createVersion: false,
  });
}

export function useStoryAutosave({
  storyId,
  payload,
  errorMessage,
  saveEndpoint,
}: UseStoryAutosaveOptions): UseStoryAutosaveResult {
  const [
    saveState,
    setSaveState,
  ] =
    useState<SaveState>(
      'saved'
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const autosaveTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const latestPayloadRef =
    useRef<StorySavePayload>(
      payload
    );

  const lastSavedRef =
    useRef<string>(
      serializePayload(
        payload
      )
    );

  const saveInFlightRef =
    useRef(false);

  const pendingSaveRef =
    useRef(false);

  const pendingVersionRef =
    useRef(false);

  const activeSavePromiseRef =
    useRef<
      Promise<boolean> | null
    >(null);

  const endpoint =
    saveEndpoint ??
    `/api/stories/${storyId}`;

  /**
   * Keep the newest React state available
   * to the save loop without depending on
   * stale closures.
   */
  useEffect(() => {
    latestPayloadRef.current =
      payload;
  }, [payload]);

  /**
   * If the save destination changes, reset the
   * comparison baseline.
   *
   * This is important when moving between the
   * normal story endpoint and revision endpoint.
   */
  useEffect(() => {
    lastSavedRef.current =
      serializePayload(
        payload
      );

    pendingSaveRef.current =
      false;

    pendingVersionRef.current =
      false;

    setSaveState(
      'saved'
    );

    setError(
      null
    );
  }, [
    endpoint,
  ]);

  /**
   * Sends saves sequentially.
   *
   * Only one PUT request can run at a time.
   *
   * If another change happens during that
   * request, the newest state is saved immediately
   * after the active request finishes.
   */
  const runSaveLoop =
    useCallback(
      async (): Promise<boolean> => {
        if (
          saveInFlightRef.current
        ) {
          pendingSaveRef.current =
            true;

          return true;
        }

        saveInFlightRef.current =
          true;

        setIsSaving(
          true
        );

        setError(
          null
        );

        let successful =
          true;

        try {
          while (
            pendingSaveRef.current
          ) {
            pendingSaveRef.current =
              false;

            const latestPayload =
              latestPayloadRef.current;

            const createVersion =
              pendingVersionRef.current;

            pendingVersionRef.current =
              false;

            const requestPayload:
              StorySavePayload = {
              ...latestPayload,

              createVersion,
            };

            const serialized =
              serializePayload(
                requestPayload
              );

            /**
             * Avoid unnecessary requests when
             * nothing has changed.
             *
             * Version saves are always allowed
             * on normal story saves.
             */
            if (
              !createVersion &&
              serialized ===
                lastSavedRef.current
            ) {
              continue;
            }

            setSaveState(
              'saving'
            );

            try {
              const response =
                await fetch(
                  endpoint,
                  {
                    method:
                      'PUT',

                    headers: {
                      'Content-Type':
                        'application/json',
                    },

                    body:
                      JSON.stringify(
                        requestPayload
                      ),
                  }
                );

              if (
                !response.ok
              ) {
                const data =
                  await response
                    .json()
                    .catch(
                      () =>
                        ({})
                    );

                throw new Error(
                  data.error ??
                    'Save failed'
                );
              }

              /**
               * Record exactly the payload that
               * this request successfully saved.
               */
              lastSavedRef.current =
                serialized;

              const newestPayload =
                latestPayloadRef.current;

              const newestSerialized =
                serializePayload(
                  newestPayload
                );

              /**
               * If the document changed while the
               * request was running, immediately
               * queue the newest state.
               */
              if (
                newestSerialized !==
                lastSavedRef.current
              ) {
                pendingSaveRef.current =
                  true;

                setSaveState(
                  'unsaved'
                );
              } else {
                setSaveState(
                  'saved'
                );
              }
            } catch (
              saveError
            ) {
              console.error(
                'Story save failed:',
                saveError
              );

              successful =
                false;

              setSaveState(
                'error'
              );

              setError(
                saveError instanceof
                  Error
                  ? saveError.message
                  : errorMessage
              );

              break;
            }
          }
        } finally {
          saveInFlightRef.current =
            false;

          setIsSaving(
            false
          );
        }

        return successful;
      },
      [
        endpoint,
        errorMessage,
      ]
    );

  /**
   * Adds work to the save queue.
   */
  const queueSave =
    useCallback(
      async (
        createVersion =
          false
      ): Promise<boolean> => {
        if (
          createVersion
        ) {
          pendingVersionRef.current =
            true;
        }

        pendingSaveRef.current =
          true;

        while (true) {
          if (
            !activeSavePromiseRef.current
          ) {
            activeSavePromiseRef.current =
              runSaveLoop();
          }

          const currentPromise =
            activeSavePromiseRef.current;

          const successful =
            await currentPromise;

          if (
            activeSavePromiseRef.current ===
            currentPromise
          ) {
            activeSavePromiseRef.current =
              null;
          }

          if (
            !successful
          ) {
            return false;
          }

          if (
            !pendingSaveRef.current
          ) {
            return true;
          }
        }
      },
      [
        runSaveLoop,
      ]
    );

  /**
   * Normal editor autosave.
   */
  useEffect(() => {
    latestPayloadRef.current =
      payload;

    const serialized =
      serializePayload(
        payload
      );

    if (
      serialized ===
      lastSavedRef.current
    ) {
      return;
    }

    setSaveState(
      'unsaved'
    );

    if (
      autosaveTimerRef.current
    ) {
      clearTimeout(
        autosaveTimerRef.current
      );
    }

    autosaveTimerRef.current =
      setTimeout(
        () => {
          void queueSave(
            false
          );
        },
        AUTOSAVE_DELAY
      );

    return () => {
      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };
  }, [
    payload,
    queueSave,
  ]);

  /**
   * Clear the current debounce timer.
   */
  const clearAutosaveTimer =
    useCallback(() => {
      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current
        );

        autosaveTimerRef.current =
          null;
      }
    }, []);

  /**
   * Forces the newest editor state to save.
   */
  const flushSave =
    useCallback(
      async (): Promise<boolean> => {
        clearAutosaveTimer();

        latestPayloadRef.current =
          payload;

        const serialized =
          serializePayload(
            payload
          );

        if (
          serialized !==
            lastSavedRef.current ||
          saveInFlightRef.current
        ) {
          return queueSave(
            false
          );
        }

        return true;
      },
      [
        payload,
        queueSave,
        clearAutosaveTimer,
      ]
    );

  /**
   * Manual Save button.
   */
  const saveNow =
    useCallback(
      async (): Promise<boolean> => {
        return flushSave();
      },
      [
        flushSave,
      ]
    );

  /**
   * Manual "Save + Version".
   *
   * Revision saves do not need to create public
   * story_versions snapshots, but preserving the
   * flag here keeps the hook compatible with the
   * existing draft workflow.
   */
  const saveVersion =
    useCallback(
      async (): Promise<boolean> => {
        clearAutosaveTimer();

        latestPayloadRef.current =
          payload;

        return queueSave(
          true
        );
      },
      [
        payload,
        queueSave,
        clearAutosaveTimer,
      ]
    );

  /**
   * Reset the saved comparison point.
   *
   * We will use this after:
   * - loading a previously saved revision
   * - reverting unpublished changes
   * - publishing a revision
   */
  const resetSavedState =
    useCallback(
      (
        nextPayload =
          latestPayloadRef.current
      ) => {
        clearAutosaveTimer();

        latestPayloadRef.current =
          nextPayload;

        lastSavedRef.current =
          serializePayload(
            nextPayload
          );

        pendingSaveRef.current =
          false;

        pendingVersionRef.current =
          false;

        setError(
          null
        );

        setSaveState(
          'saved'
        );
      },
      [
        clearAutosaveTimer,
      ]
    );

  return {
    saveState,
    isSaving,
    error,

    saveNow,
    saveVersion,
    flushSave,

    resetSavedState,
  };
}