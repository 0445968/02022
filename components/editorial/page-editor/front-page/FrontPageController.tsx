'use client';

import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useRouter,
} from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type {
  HomepageSlotType,
} from '@/lib/db/database.types';
import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepageLayoutDraft,
  HomepageLayoutSelection,
  HomepagePlacement,
} from '@/lib/services/front-page';
import type {
  Locale,
} from '@/types';
import type {
  Category,
} from '@/types/editorial';

import {
  BreakingNewsEditor,
} from './BreakingNewsEditor';
import {
  FrontPageLayoutEditor,
} from './FrontPageLayoutEditor';
import {
  FrontPageWorkspace,
} from './FrontPageWorkspace';
import {
  HeadlineBarEditor,
} from './HeadlineBarEditor';

interface FrontPageControllerProps {
  locale: Locale;

  placements:
    HomepagePlacement[];

  layoutDraft:
    HomepageLayoutDraft | null;

  breakingNews:
    BreakingNewsItem[];

  stories:
    FrontPageStoryOption[];

  worldStories?:
    | FrontPageStoryOption[]
    | null;

  categories:
    Category[];

  onStateChange?: (
    state: FrontPageEditorState
  ) => void;
}

export interface FrontPageControllerHandle {
  publish:
    () => Promise<void>;

  revert:
    () => Promise<void>;

  hasChanges:
    () => boolean;
}

export interface FrontPageEditorState {
  assignedSlots: number;
  totalSlots: number;
  changeCount: number;
  hasChanges: boolean;
  busy: boolean;
}

type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error';

type ConfirmAction =
  | 'publish'
  | 'revert'
  | null;

const HEADLINE_BAR_SLOT_COUNT =
  5;

const FIXED_LAYOUT_SLOT_COUNT =
  42;

function placementsToSelections(
  placements:
    HomepagePlacement[]
): HomepageLayoutSelection[] {
  return placements
    .filter(
      (placement) =>
        placement.active
    )
    .map(
      (placement) => ({
        slot:
          placement.slot,

        position:
          placement.position,

        categoryId:
          placement.categoryId,

        storyId:
          placement.story.id,
      })
    );
}

function selectionKey(
  selection:
    HomepageLayoutSelection
) {
  return [
    selection.slot,
    selection.position,
    selection.categoryId ??
      '',
  ].join(':');
}

function countSelectionChanges(
  draft:
    HomepageLayoutSelection[],
  published:
    HomepageLayoutSelection[]
) {
  const draftMap =
    new Map(
      draft.map(
        (selection) => [
          selectionKey(
            selection
          ),
          selection.storyId,
        ]
      )
    );

  const publishedMap =
    new Map(
      published.map(
        (selection) => [
          selectionKey(
            selection
          ),
          selection.storyId,
        ]
      )
    );

  const keys =
    new Set([
      ...Array.from(draftMap.keys()),
      ...Array.from(publishedMap.keys()),
    ]);

  let count =
    0;

  keys.forEach(
    (key) => {
      if (
        draftMap.get(
          key
        ) !==
        publishedMap.get(
          key
        )
      ) {
        count +=
          1;
      }
    }
  );

  return count;
}

function isHeadlineBarSelection(
  selection:
    HomepageLayoutSelection
) {
  return (
    selection.slot ===
    'headline_bar'
  );
}

export const FrontPageController =
  forwardRef<
    FrontPageControllerHandle,
    FrontPageControllerProps
  >(
    function FrontPageController(
      {
        locale,
        placements,
        layoutDraft,
        breakingNews,
        stories,
        worldStories = [],
        categories,
        onStateChange,
      },
      ref
    ) {
      const router =
        useRouter();

      const initialPublished =
        useMemo(
          () =>
            placementsToSelections(
              placements
            ),
          [
            placements,
          ]
        );

      const initialDraft =
        layoutDraft?.selections ??
        initialPublished;

      const [
        selections,
        setSelections,
      ] =
        useState<
          HomepageLayoutSelection[]
        >(
          initialDraft
        );

      const [
        publishedSelections,
        setPublishedSelections,
      ] =
        useState<
          HomepageLayoutSelection[]
        >(
          initialPublished
        );

      const [
        saveStatus,
        setSaveStatus,
      ] =
        useState<SaveStatus>(
          'idle'
        );

      const [
        lastSavedAt,
        setLastSavedAt,
      ] =
        useState<
          string | null
        >(
          layoutDraft
            ?.updatedAt ??
            null
        );

      const [
        busy,
        setBusy,
      ] =
        useState(
          false
        );

      const [
        error,
        setError,
      ] =
        useState<
          string | null
        >(
          null
        );

      const [
        successMessage,
        setSuccessMessage,
      ] =
        useState<
          string | null
        >(
          null
        );

      const [
        confirmAction,
        setConfirmAction,
      ] =
        useState<ConfirmAction>(
          null
        );

      const initialAutosave =
        useRef(
          true
        );

      const autosaveController =
        useRef<
          AbortController | null
        >(
          null
        );

      const autosaveTimeout =
        useRef<
          number | null
        >(
          null
        );

      const safeWorldStories =
        useMemo(
          () =>
            Array.isArray(
              worldStories
            )
              ? worldStories
              : [],
          [
            worldStories,
          ]
        );

      const allStories =
        useMemo(
          () => {
            const byId =
              new Map<
                string,
                FrontPageStoryOption
              >();

            [
              ...stories,
              ...safeWorldStories,
            ].forEach(
              (
                story
              ) =>
                byId.set(
                  story.id,
                  story
                )
            );

            placements.forEach(
              (
                placement
              ) =>
                byId.set(
                  placement.story.id,
                  placement.story
                )
            );

            return Array.from(
              byId.values()
            );
          },
          [
            placements,
            safeWorldStories,
            stories,
          ]
        );

      const storyById =
        useMemo(
          () =>
            new Map(
              allStories.map(
                (
                  story
                ) => [
                  story.id,
                  story,
                ]
              )
            ),
          [
            allStories,
          ]
        );

      const layoutSelections =
        useMemo(
          () =>
            selections.filter(
              (
                selection
              ) =>
                !isHeadlineBarSelection(
                  selection
                )
            ),
          [
            selections,
          ]
        );

      const headlineBarSelections =
        useMemo(
          () =>
            selections.filter(
              isHeadlineBarSelection
            ),
          [
            selections,
          ]
        );

      const publishedLayoutSelections =
        useMemo(
          () =>
            publishedSelections.filter(
              (
                selection
              ) =>
                !isHeadlineBarSelection(
                  selection
                )
            ),
          [
            publishedSelections,
          ]
        );

      const publishedHeadlineSelections =
        useMemo(
          () =>
            publishedSelections.filter(
              isHeadlineBarSelection
            ),
          [
            publishedSelections,
          ]
        );

      const layoutSelectedStoryIds =
        useMemo(
          () =>
            layoutSelections.map(
              (
                selection
              ) =>
                selection.storyId
            ),
          [
            layoutSelections,
          ]
        );

      const headlineBarSelectedStoryIds =
        useMemo(
          () =>
            headlineBarSelections.map(
              (
                selection
              ) =>
                selection.storyId
            ),
          [
            headlineBarSelections,
          ]
        );

      const headlineBarStories =
        useMemo(
          () =>
            Array.from(
              {
                length:
                  HEADLINE_BAR_SLOT_COUNT,
              },
              (
                _,
                position
              ) => {
                const selection =
                  headlineBarSelections.find(
                    (
                      item
                    ) =>
                      item.position ===
                      position
                  );

                if (
                  !selection
                ) {
                  return null;
                }

                return (
                  storyById.get(
                    selection.storyId
                  ) ??
                  null
                );
              }
            ),
          [
            headlineBarSelections,
            storyById,
          ]
        );

      const activeCategoryCount =
        useMemo(
          () =>
            categories.filter(
              (
                category
              ) =>
                category.active
            ).length,
          [
            categories,
          ]
        );

      const layoutTotalSlots =
        FIXED_LAYOUT_SLOT_COUNT +
        activeCategoryCount;

      const headlineBarTotalSlots =
        HEADLINE_BAR_SLOT_COUNT;

      const layoutAssignedSlots =
        layoutSelections.length;

      const headlineBarAssignedSlots =
        headlineBarSelections.length;

      const layoutChangeCount =
        useMemo(
          () =>
            countSelectionChanges(
              layoutSelections,
              publishedLayoutSelections
            ),
          [
            layoutSelections,
            publishedLayoutSelections,
          ]
        );

      const headlineBarChangeCount =
        useMemo(
          () =>
            countSelectionChanges(
              headlineBarSelections,
              publishedHeadlineSelections
            ),
          [
            headlineBarSelections,
            publishedHeadlineSelections,
          ]
        );

      const totalChangeCount =
        layoutChangeCount +
        headlineBarChangeCount;

      const totalAssignedSlots =
        layoutAssignedSlots +
        headlineBarAssignedSlots;

      const totalSlots =
        layoutTotalSlots +
        headlineBarTotalSlots;

      const hasChanges =
        totalChangeCount >
        0;

      const activeBreakingCount =
        breakingNews.filter(
          (
            item
          ) =>
            item.active
        ).length;

      useEffect(
        () => {
          onStateChange?.({
            assignedSlots:
              totalAssignedSlots,

            totalSlots,

            changeCount:
              totalChangeCount,

            hasChanges,

            busy,
          });
        },
        [
          busy,
          hasChanges,
          onStateChange,
          totalAssignedSlots,
          totalChangeCount,
          totalSlots,
        ]
      );

      const saveDraft =
        useCallback(
          async (
            nextSelections:
              HomepageLayoutSelection[],
            signal?:
              AbortSignal
          ) => {
            setSaveStatus(
              'saving'
            );

            setError(
              null
            );

            const response =
              await fetch(
                '/api/front-page/layout-draft',
                {
                  method:
                    'POST',

                  headers: {
                    'Content-Type':
                      'application/json',
                  },

                  body:
                    JSON.stringify(
                      {
                        selections:
                          nextSelections,
                      }
                    ),

                  signal,
                }
              );

            const data =
              await response
                .json()
                .catch(
                  () =>
                    null
                );

            if (
              !response.ok ||
              !data?.draft
            ) {
              throw new Error(
                data?.error ??
                  'Unable to save the Front Page draft.'
              );
            }

            setLastSavedAt(
              data.draft
                .updatedAt
            );

            setSaveStatus(
              'saved'
            );

            return data.draft as HomepageLayoutDraft;
          },
          []
        );

      useEffect(
        () => {
          if (
            initialAutosave.current
          ) {
            initialAutosave.current =
              false;

            return;
          }

          const controller =
            new AbortController();

          autosaveController.current =
            controller;

          autosaveTimeout.current =
            window.setTimeout(
              () => {
                void saveDraft(
                  selections,
                  controller.signal
                ).catch(
                  (
                    autosaveError
                  ) => {
                    if (
                      autosaveError instanceof
                        DOMException &&
                      autosaveError.name ===
                        'AbortError'
                    ) {
                      return;
                    }

                    setSaveStatus(
                      'error'
                    );

                    setError(
                      autosaveError instanceof
                        Error
                        ? autosaveError.message
                        : 'Unable to autosave the Front Page draft.'
                    );
                  }
                );
              },
              900
            );

            return () => {
                if (
                  autosaveTimeout.current !==
                  null
                ) {
                  window.clearTimeout(
                    autosaveTimeout.current
                  );
              
                  autosaveTimeout.current =
                    null;
                }
              };
        },
        [
          saveDraft,
          selections,
        ]
      );

      function getStory(
        storyId:
          string
      ) {
        return (
          storyById.get(
            storyId
          ) ??
          null
        );
      }

      function getSelection(
        slot:
          HomepageSlotType,
        position = 0
      ) {
        return (
          selections.find(
            (
              selection
            ) =>
              selection.slot ===
                slot &&
              selection.position ===
                position
          ) ??
          null
        );
      }

      function setSelection(
        slot:
          HomepageSlotType,
        position:
          number,
        story:
          FrontPageStoryOption,
        categoryId:
          | string
          | null = null
      ) {
        setSuccessMessage(
          null
        );

        setSelections(
          (
            current
          ) => [
            ...current.filter(
              (
                selection
              ) =>
                !(
                  selection.slot ===
                    slot &&
                  selection.position ===
                    position
                ) &&
                !(
                  slot ===
                    'section_feature' &&
                  selection.slot ===
                    'section_feature' &&
                  selection.categoryId ===
                    categoryId
                )
            ),

            {
              slot,

              position,

              categoryId,

              storyId:
                story.id,
            },
          ]
        );
      }

      function removeSelection(
        slot:
          HomepageSlotType,
        position = 0
      ) {
        setSuccessMessage(
          null
        );

        setSelections(
          (
            current
          ) =>
            current.filter(
              (
                selection
              ) =>
                !(
                  selection.slot ===
                    slot &&
                  selection.position ===
                    position
                )
            )
        );
      }

      const publishFrontPage =
        useCallback(
          async () => {
            if (
              busy
            ) {
              return;
            }

            setBusy(
              true
            );

            setError(
              null
            );

            setSuccessMessage(
              null
            );

            try {
              if (
                autosaveTimeout.current !==
                null
              ) {
                window.clearTimeout(
                  autosaveTimeout.current
                );

                autosaveTimeout.current =
                  null;
              }


              await saveDraft(
                selections
              );

              const response =
                await fetch(
                  '/api/front-page/layout-publish',
                  {
                    method:
                      'POST',

                    headers: {
                      'Content-Type':
                        'application/json',
                    },

                    body:
                      JSON.stringify(
                        {
                          selections,
                        }
                      ),
                  }
                );

              const data =
                await response
                  .json()
                  .catch(
                    () =>
                      null
                  );

              if (
                !response.ok ||
                !Array.isArray(
                  data?.placements
                )
              ) {
                throw new Error(
                  data?.error ??
                    'Unable to publish the Front Page.'
                );
              }

              setPublishedSelections(
                selections
              );

              setSaveStatus(
                'saved'
              );

              setLastSavedAt(
                new Date()
                  .toISOString()
              );

              setSuccessMessage(
                locale ===
                'es'
                  ? 'Portada publicada correctamente.'
                  : 'Front Page published successfully.'
              );

              router.refresh();
            } catch (
              publishError
            ) {
              setSaveStatus(
                'error'
              );

              setError(
                publishError instanceof
                  Error
                  ? publishError.message
                  : locale ===
                      'es'
                    ? 'No se pudo publicar la portada.'
                    : 'Unable to publish the Front Page.'
              );
            } finally {
              setBusy(
                false
              );
            }
          },
          [
            busy,
            locale,
            router,
            saveDraft,
            selections,
          ]
        );

      const revertFrontPage =
        useCallback(
          async () => {
            if (
              busy
            ) {
              return;
            }

            setBusy(
              true
            );

            setError(
              null
            );

            setSuccessMessage(
              null
            );

            try {
              const restored =
                [
                  ...publishedSelections,
                ];

              setSelections(
                restored
              );

              await saveDraft(
                restored
              );

              setSuccessMessage(
                locale ===
                'es'
                  ? 'Los cambios sin publicar de la portada fueron revertidos.'
                  : 'Unpublished Front Page changes were reverted.'
              );
            } catch (
              revertError
            ) {
              setError(
                revertError instanceof
                  Error
                  ? revertError.message
                  : locale ===
                      'es'
                    ? 'No se pudieron revertir los cambios.'
                    : 'Unable to revert Front Page changes.'
              );
            } finally {
              setBusy(
                false
              );
            }
          },
          [
            busy,
            locale,
            publishedSelections,
            saveDraft,
          ]
        );

      useImperativeHandle(
        ref,
        () => ({
          publish:
            publishFrontPage,

          revert:
            revertFrontPage,

          hasChanges:
            () =>
              hasChanges,
        }),
        [
          hasChanges,
          publishFrontPage,
          revertFrontPage,
        ]
      );

      return (
        <>
          <div
            className="
              min-w-0
            "
          >
            <FrontPageActionBar
              locale={
                locale
              }
              saveStatus={
                saveStatus
              }
              lastSavedAt={
                lastSavedAt
              }
              changeCount={
                totalChangeCount
              }
              assignedSlots={
                totalAssignedSlots
              }
              totalSlots={
                totalSlots
              }
              busy={
                busy
              }
              onPublish={() =>
                setConfirmAction(
                  'publish'
                )
              }
              onRevert={() =>
                setConfirmAction(
                  'revert'
                )
              }
            />

            {successMessage && (
              <div
                className="
                  mx-4
                  mt-4
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  text-emerald-800
                  sm:mx-6
                "
              >
                <CheckCircle2
                  className="
                    h-4
                    w-4
                    shrink-0
                  "
                  aria-hidden
                />

                <span>
                  {
                    successMessage
                  }
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="
                  mx-4
                  mt-4
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-breaking/20
                  bg-breaking/5
                  px-4
                  py-3
                  text-sm
                  text-breaking
                  sm:mx-6
                "
              >
                <AlertCircle
                  className="
                    mt-0.5
                    h-4
                    w-4
                    shrink-0
                  "
                  aria-hidden
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            <FrontPageWorkspace
              locale={
                locale
              }
              layoutAssignedSlots={
                layoutAssignedSlots
              }
              layoutTotalSlots={
                layoutTotalSlots
              }
              layoutChangeCount={
                layoutChangeCount
              }
              headlineBarAssignedSlots={
                headlineBarAssignedSlots
              }
              headlineBarTotalSlots={
                headlineBarTotalSlots
              }
              headlineBarChangeCount={
                headlineBarChangeCount
              }
              activeBreakingCount={
                activeBreakingCount
              }
              layoutContent={
                <FrontPageLayoutEditor
                  locale={
                    locale
                  }
                  stories={
                    stories
                  }
                  worldStories={
                    safeWorldStories
                  }
                  categories={
                    categories
                  }
                  selections={
                    selections
                  }
                  excludedStoryIds={
                    layoutSelectedStoryIds
                  }
                  disabled={
                    busy
                  }
                  getStory={
                    getStory
                  }
                  getSelection={
                    getSelection
                  }
                  onSelect={
                    setSelection
                  }
                  onRemove={
                    removeSelection
                  }
                />
              }
              headlineBarContent={
                <HeadlineBarEditor
                  locale={
                    locale
                  }
                  stories={
                    allStories
                  }
                  selectedStories={
                    headlineBarStories
                  }
                  excludedStoryIds={
                    headlineBarSelectedStoryIds
                  }
                  disabled={
                    busy
                  }
                  onSelect={(
                    position,
                    story
                  ) =>
                    setSelection(
                      'headline_bar',
                      position,
                      story
                    )
                  }
                  onRemove={(
                    position
                  ) =>
                    removeSelection(
                      'headline_bar',
                      position
                    )
                  }
                />
              }
              breakingNewsContent={
                <BreakingNewsEditor
                  locale={
                    locale
                  }
                  items={
                    breakingNews
                  }
                  stories={
                    stories
                  }
                  onChanged={() =>
                    router.refresh()
                  }
                />
              }
            />
          </div>

          <AlertDialog
            open={
              confirmAction !==
              null
            }
            onOpenChange={(
              open
            ) => {
              if (
                !open
              ) {
                setConfirmAction(
                  null
                );
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmAction ===
                  'publish'
                    ? locale ===
                      'es'
                      ? '¿Publicar la portada?'
                      : 'Publish Front Page?'
                    : locale ===
                        'es'
                      ? '¿Revertir los cambios?'
                      : 'Revert Front Page changes?'}
                </AlertDialogTitle>

                <AlertDialogDescription>
                  {confirmAction ===
                  'publish'
                    ? locale ===
                      'es'
                      ? 'Todos los cambios sin publicar de la portada se harán públicos inmediatamente.'
                      : 'All unpublished Front Page changes will become public immediately.'
                    : locale ===
                        'es'
                      ? 'El borrador será reemplazado por la última versión publicada de la portada.'
                      : 'The draft will be replaced with the currently published Front Page layout.'}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>
                  {locale ===
                  'es'
                    ? 'Cancelar'
                    : 'Cancel'}
                </AlertDialogCancel>

                <AlertDialogAction
                  className={
                    confirmAction ===
                    'revert'
                      ? 'bg-breaking text-white hover:bg-breaking/90'
                      : ''
                  }
                  onClick={() => {
                    const action =
                      confirmAction;

                    setConfirmAction(
                      null
                    );

                    if (
                      action ===
                      'publish'
                    ) {
                      void publishFrontPage();
                    }

                    if (
                      action ===
                      'revert'
                    ) {
                      void revertFrontPage();
                    }
                  }}
                >
                  {confirmAction ===
                  'publish'
                    ? locale ===
                      'es'
                      ? 'Publicar portada'
                      : 'Publish Front Page'
                    : locale ===
                        'es'
                      ? 'Revertir'
                      : 'Revert'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    }
  );

FrontPageController.displayName =
  'FrontPageController';

function FrontPageActionBar({
  locale,
  saveStatus,
  lastSavedAt,
  changeCount,
  assignedSlots,
  totalSlots,
  busy,
  onPublish,
  onRevert,
}: {
  locale:
    Locale;

  saveStatus:
    SaveStatus;

  lastSavedAt:
    string | null;

  changeCount:
    number;

  assignedSlots:
    number;

  totalSlots:
    number;

  busy:
    boolean;

  onPublish:
    () => void;

  onRevert:
    () => void;
}) {
  return (
    <div
      className="
        flex
        flex-col
        gap-3
        border-b
        border-border
        bg-white
        px-4
        py-3
        sm:px-6
        lg:flex-row
        lg:items-center
        lg:justify-between
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-3
        "
      >
        <SaveStatusIcon
          status={
            saveStatus
          }
        />

        <div
          className="
            min-w-0
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-1
            "
          >
            <p
              className="
                text-xs
                font-bold
                text-deep
              "
            >
              {
                assignedSlots
              }
              /
              {
                totalSlots
              }{' '}

              {locale ===
              'es'
                ? 'espacios asignados'
                : 'slots assigned'}
            </p>

            {changeCount >
              0 && (
              <span
                className="
                  inline-flex
                  rounded-full
                  bg-primary/10
                  px-2
                  py-1
                  text-[10px]
                  font-bold
                  text-primary
                "
              >
                {
                  changeCount
                }{' '}

                {locale ===
                'es'
                  ? changeCount ===
                    1
                    ? 'cambio'
                    : 'cambios'
                  : changeCount ===
                      1
                    ? 'change'
                    : 'changes'}
              </span>
            )}
          </div>

          <p
            className="
              mt-0.5
              truncate
              text-[11px]
              text-muted-foreground
            "
          >
            {lastSavedAt
              ? `${
                  locale ===
                  'es'
                    ? 'Último guardado'
                    : 'Last saved'
                } ${new Date(
                  lastSavedAt
                ).toLocaleTimeString(
                  locale,
                  {
                    hour:
                      'numeric',

                    minute:
                      '2-digit',
                  }
                )}`
              : locale ===
                  'es'
                ? 'El borrador aún no se ha guardado.'
                : 'The draft has not been saved yet.'}
          </p>
        </div>
      </div>

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-2
        "
      >
        <button
          type="button"
          disabled={
            busy ||
            changeCount ===
              0
          }
          onClick={
            onRevert
          }
          className="
            inline-flex
            h-9
            items-center
            gap-2
            rounded-lg
            border
            border-border
            bg-white
            px-3
            text-xs
            font-semibold
            text-deep
            transition-colors
            hover:bg-surface-muted
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <RotateCcw
            className="
              h-4
              w-4
            "
            aria-hidden
          />

          {locale ===
          'es'
            ? 'Revertir página'
            : 'Revert Page'}
        </button>

        <button
          type="button"
          disabled={
            busy ||
            changeCount ===
              0
          }
          onClick={
            onPublish
          }
          className="
            inline-flex
            h-9
            items-center
            gap-2
            rounded-lg
            bg-primary
            px-3
            text-xs
            font-bold
            text-white
            transition-colors
            hover:bg-primary/90
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          {busy ? (
            <Loader2
              className="
                h-4
                w-4
                animate-spin
              "
              aria-hidden
            />
          ) : (
            <Send
              className="
                h-4
                w-4
              "
              aria-hidden
            />
          )}

          {locale ===
          'es'
            ? 'Publicar página'
            : 'Publish Page'}
        </button>
      </div>
    </div>
  );
}

function SaveStatusIcon({
  status,
}: {
  status:
    SaveStatus;
}) {
  if (
    status ===
    'saving'
  ) {
    return (
      <Loader2
        className="
          h-4
          w-4
          shrink-0
          animate-spin
          text-primary
        "
        aria-hidden
      />
    );
  }

  if (
    status ===
    'saved'
  ) {
    return (
      <CheckCircle2
        className="
          h-4
          w-4
          shrink-0
          text-emerald-600
        "
        aria-hidden
      />
    );
  }

  if (
    status ===
    'error'
  ) {
    return (
      <AlertCircle
        className="
          h-4
          w-4
          shrink-0
          text-breaking
        "
        aria-hidden
      />
    );
  }

  return (
    <Cloud
      className="
        h-4
        w-4
        shrink-0
        text-muted-foreground
      "
      aria-hidden
    />
  );
}
