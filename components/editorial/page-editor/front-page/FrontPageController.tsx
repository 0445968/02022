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

import {HOME_SECTIONS,countVisibilityChanges,type HomeVisibility,type HomeSection} from '@/lib/permissions/homepage-visibility';
import {parseVersionedLayout,type VersionedLayout,type LayoutCommand} from '@/lib/permissions/homepage-history-contract';
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
  versioned?:VersionedLayout|null;
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
  restore:(revision:number)=>Promise<void>;
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
        versioned=null,
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
            versioned?.published??placementsToSelections(
              placements
            ),
          [
            placements,versioned,
          ]
        );

      const initialDraft =
        versioned?.selections??layoutDraft?.selections ??
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
          versioned?.updatedAt??layoutDraft
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

      const [visibility,setVisibility]=useState<HomeVisibility|null>(versioned?.visibility??null);
      const [publishedVisibility,setPublishedVisibility]=useState<HomeVisibility|null>(versioned?.publishedVisibility??null);
      const visibilityRef=useRef<HomeVisibility|null>(versioned?.visibility??null);
      function toggleSection(key:HomeSection,visible:boolean){if(!visibilityRef.current||mutationLock.current)return;const next={...visibilityRef.current,[key]:visible};visibilityRef.current=next;setVisibility(next);}
      const mutationLock=useRef(false);
      const versionRef=useRef(versioned?.revision??null);
      const uncertain=useRef(false);
      const versionCommand=useCallback(async(action:LayoutCommand['action'],copy:HomepageLayoutSelection[]|null,restoreRevision:number|null)=>{
       if(versionRef.current===null||uncertain.current)throw Error('Reload before changing the layout.');
       const expectedRevision=versionRef.current;
       try{
        const response=await fetch('/api/front-page/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,expectedRevision,selections:copy,restoreRevision,...(visibilityRef.current&&(action==='save'||action==='publish')?{visibility:visibilityRef.current}:{})})});
        if(!response.ok)throw Error('Layout changed or is unavailable. Reload before retrying.');
        const state=parseVersionedLayout(await response.json());
        if(state.revision!==expectedRevision+1)throw Error('Unexpected layout revision.');
        versionRef.current=state.revision;setLastSavedAt(state.updatedAt);if(state.visibility&&(action==='revert'||action==='restore'||action==='publish')){visibilityRef.current=state.visibility;setVisibility(state.visibility);}if(state.publishedVisibility&&action==='publish')setPublishedVisibility(state.publishedVisibility);return state;
       }catch(e){uncertain.current=true;throw e;}
      },[]);
      const autosaveTail=useRef<Promise<unknown>>(Promise.resolve());
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
        headlineBarChangeCount+countVisibilityChanges(visibility,publishedVisibility);

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

            busy:busy||saveStatus==='saving',
          });
        },
        [
          busy,
          saveStatus,
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

            if(versionRef.current!==null){const state=await versionCommand('save',nextSelections,null);setSaveStatus('saved');return {selections:state.selections,updatedAt:state.updatedAt};}
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
          [versionCommand]
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
                const queued=autosaveTail.current.catch(()=>undefined).then(()=>{if(controller.signal.aborted||mutationLock.current)return;return saveDraft(selections);});
                autosaveTail.current=queued;
                void queued.catch(
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
                controller.abort();
                // Cancel queued work but allow dispatched writes to finish in order.
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
          visibility,
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
        if(mutationLock.current)return;
        setSuccessMessage(null);
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
        if(mutationLock.current)return;
        setSuccessMessage(null);
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
            if (busy||mutationLock.current) {
              return;
            }

            mutationLock.current=true;
            setBusy(true);

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


              await autosaveTail.current.catch(()=>undefined);
              if(versionRef.current!==null){const state=await versionCommand('publish',selections,null);setPublishedSelections(state.published);setSaveStatus('saved');setSuccessMessage(locale==='es'?'Portada publicada.':'Front Page published.');router.refresh();return;}
              await saveDraft(selections);

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
              mutationLock.current=false;
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
            versionCommand,
          ]
        );

      const revertFrontPage =
        useCallback(
          async () => {
            if (busy||mutationLock.current) {
              return;
            }

            mutationLock.current=true;
            setBusy(true);

            setError(
              null
            );

            setSuccessMessage(
              null
            );

            try {
              if(autosaveTimeout.current!==null){window.clearTimeout(autosaveTimeout.current);autosaveTimeout.current=null;}
              await autosaveTail.current.catch(()=>undefined);
              const restored =
                [
                  ...publishedSelections,
                ];

              const next=versionRef.current!==null?(await versionCommand('revert',null,null)).selections:(await saveDraft(restored)).selections;
              initialAutosave.current=true;
              setSelections(next);setSaveStatus('saved');

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
              mutationLock.current=false;
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
            versionCommand,
          ]
        );

      const restoreVersion=useCallback(async(revision:number)=>{
       if(mutationLock.current||uncertain.current||versionRef.current===null)throw Error('Reload before changing the layout.');
       mutationLock.current=true;setBusy(true);setError(null);
       try{if(autosaveTimeout.current!==null){window.clearTimeout(autosaveTimeout.current);autosaveTimeout.current=null;}await autosaveTail.current.catch(()=>undefined);
        const state=await versionCommand('restore',null,revision);initialAutosave.current=true;setSelections(state.selections);setSaveStatus('saved');setSuccessMessage(locale==='es'?'Versión restaurada como borrador.':'Version restored as draft.');
       }catch(e){setError(locale==='es'?'No se pudo restaurar. Recargue.':'Unable to restore. Reload before retrying.');throw e;}
       finally{mutationLock.current=false;setBusy(false);}
      },[versionCommand,locale]);

      useImperativeHandle(
        ref,
        () => ({
          restore:restoreVersion,
          publish:async()=>{if(!mutationLock.current)setConfirmAction('publish');},

          revert:async()=>{if(!mutationLock.current)setConfirmAction('revert');},

          hasChanges:
            () =>
              hasChanges,
        }),
        [
          hasChanges,
          publishFrontPage,
          revertFrontPage,
          restoreVersion,
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

            {visibility&&<section className="mx-4 mb-3 rounded-lg border border-border bg-white p-3 sm:mx-6"><h2 className="font-headline text-lg font-semibold text-deep">{locale==='es'?'Visibilidad de secciones':'Section visibility'}</h2><p className="mt-1 text-xs text-muted-foreground">{locale==='es'?'Los cambios se guardan como borrador. Las historias se conservan al ocultar una sección. La cuadrícula principal siempre está visible.':'Changes are saved as a draft. Hidden sections retain their selections. The lead grid always remains visible.'}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{HOME_SECTIONS.map(([key,en,es])=><label key={key} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"><span>{locale==='es'?es:en}{publishedVisibility&&publishedVisibility[key]!==visibility[key]&&<span className="ml-1 text-xs text-primary">{locale==='es'?'Sin publicar':'Unpublished'}</span>}</span><input type="checkbox" checked={visibility[key]} disabled={busy} onChange={e=>toggleSection(key,e.target.checked)}/></label>)}</div></section>}
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
