'use client';

import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Eye,
  Headphones,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
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
  Dictionary,
} from '@/lib/i18n/dictionaries';
import type {
  HomeStory,
} from '@/lib/services/home';
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
  FrontPagePreview,
} from './FrontPagePreview';
import {
  HomepageSlotCard,
} from './HomepageSlotCard';
import {
  SectionFeaturesEditor,
} from './SectionFeaturesEditor';

interface FrontPageEditorProps {
  dict: Dictionary;
  locale: Locale;
  placements: HomepagePlacement[];
  layoutDraft: HomepageLayoutDraft | null;
  breakingNews: BreakingNewsItem[];
  stories: FrontPageStoryOption[];

  worldStories?:
    | FrontPageStoryOption[]
    | null;

  categories: Category[];

  acrossTheIslands: {
    sanAndres: HomeStory[];
    oldProvidence: HomeStory[];
    saintCatalina: HomeStory[];
  };
}

type FrontPageTab =
  | 'layout'
  | 'breaking';

type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error';

type ConfirmAction =
  | 'save'
  | 'revert'
  | 'clear'
  | 'publish';

const ACTION_COPY: Record<
  ConfirmAction,
  {
    titleEn: string;
    titleEs: string;
    descriptionEn: string;
    descriptionEs: string;
    confirmEn: string;
    confirmEs: string;
    destructive?: boolean;
  }
> = {
  save: {
    titleEn:
      'Save this draft?',
    titleEs:
      '¿Guardar este borrador?',
    descriptionEn:
      'This saves the current selections for editors. It will not change the public homepage.',
    descriptionEs:
      'Esto guarda las selecciones actuales para los editores. No cambiará la portada pública.',
    confirmEn:
      'Save Draft',
    confirmEs:
      'Guardar borrador',
  },

  revert: {
    titleEn:
      'Revert draft changes?',
    titleEs:
      '¿Revertir cambios del borrador?',
    descriptionEn:
      'The draft will be replaced with the layout currently published on the homepage.',
    descriptionEs:
      'El borrador será reemplazado por el diseño publicado actualmente en la portada.',
    confirmEn:
      'Revert Changes',
    confirmEs:
      'Revertir cambios',
    destructive:
      true,
  },

  clear: {
    titleEn:
      'Clear every selection?',
    titleEs:
      '¿Borrar todas las selecciones?',
    descriptionEn:
      'Every article slot in the draft will be emptied. The public homepage will remain unchanged until you submit the layout.',
    descriptionEs:
      'Todos los espacios del borrador quedarán vacíos. La portada pública no cambiará hasta que envíes el diseño.',
    confirmEn:
      'Clear All',
    confirmEs:
      'Borrar todo',
    destructive:
      true,
  },

  publish: {
    titleEn:
      'Publish this homepage layout?',
    titleEs:
      '¿Publicar este diseño de portada?',
    descriptionEn:
      'The public homepage will immediately use these selections. Empty positions will remain empty.',
    descriptionEs:
      'La portada pública usará inmediatamente estas selecciones. Las posiciones vacías permanecerán vacías.',
    confirmEn:
      'Submit Layout',
    confirmEs:
      'Enviar diseño',
  },
};

function selectionSignature(
  selections:
    HomepageLayoutSelection[]
) {
  return JSON.stringify(
    [...selections].sort(
      (
        a,
        b
      ) =>
        `${a.slot}:${a.position}:${a.categoryId ?? ''}`.localeCompare(
          `${b.slot}:${b.position}:${b.categoryId ?? ''}`
        )
    )
  );
}

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

export function FrontPageEditor({
  dict,
  locale,
  placements,
  layoutDraft,
  breakingNews,
  stories,
  worldStories = [],
  categories,
  acrossTheIslands,
}: FrontPageEditorProps) {
  const router =
    useRouter();

  const initialPublished =
    useMemo(
      () =>
        placementsToSelections(
          placements
        ),
      [placements]
    );

  const initialDraft =
    layoutDraft?.selections ??
    initialPublished;

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<FrontPageTab>(
      'layout'
    );

  const [
    previewOpen,
    setPreviewOpen,
  ] =
    useState(false);

  const [
    confirmAction,
    setConfirmAction,
  ] =
    useState<ConfirmAction | null>(
      null
    );

  const [
    publishedSelections,
    setPublishedSelections,
  ] =
    useState<
      HomepageLayoutSelection[]
    >(initialPublished);

  const [
    selections,
    setSelections,
  ] =
    useState<
      HomepageLayoutSelection[]
    >(initialDraft);

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
    useState<string | null>(
      layoutDraft?.updatedAt ??
        null
    );

  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null
    );

  const [
    actionBusy,
    setActionBusy,
  ] =
    useState(false);

  const initialAutosave =
    useRef(true);

  const autosaveController =
    useRef<
      AbortController | null
    >(null);

  const autosaveTimeout =
    useRef<number | null>(
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
      [worldStories]
    );

  const allStories =
    useMemo(() => {
      const byId =
        new Map<
          string,
          FrontPageStoryOption
        >();

      [
        ...stories,
        ...safeWorldStories,
      ].forEach(
        (story) =>
          byId.set(
            story.id,
            story
          )
      );

      placements.forEach(
        (placement) =>
          byId.set(
            placement.story.id,
            placement.story
          )
      );

      return Array.from(
        byId.values()
      );
    }, [
      placements,
      safeWorldStories,
      stories,
    ]);

  const storyById =
    useMemo(
      () =>
        new Map(
          allStories.map(
            (story) => [
              story.id,
              story,
            ]
          )
        ),
      [allStories]
    );

  const selectedStoryIds =
    useMemo(
      () =>
        selections.map(
          (selection) =>
            selection.storyId
        ),
      [selections]
    );

  const isDirty =
    selectionSignature(
      selections
    ) !==
    selectionSignature(
      publishedSelections
    );

  const activeBreakingCount =
    breakingNews.filter(
      (item) =>
        item.active
    ).length;

  const saveDraft =
    useCallback(
      async (
        nextSelections:
          HomepageLayoutSelection[],
        signal?: AbortSignal
      ) => {
        setSaveStatus(
          'saving'
        );

        setActionError(
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
              () => null
            );

        if (
          !response.ok ||
          !data?.draft
        ) {
          throw new Error(
            data?.error ??
              'Unable to save the homepage layout draft.'
          );
        }

        setLastSavedAt(
          data.draft.updatedAt
        );

        setSaveStatus(
          'saved'
        );

        return data.draft as HomepageLayoutDraft;
      },
      []
    );

  useEffect(() => {
    if (
      initialAutosave.current
    ) {
      initialAutosave.current =
        false;

      return;
    }

    autosaveController
      .current
      ?.abort();

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
            (error) => {
              if (
                error instanceof
                  DOMException &&
                error.name ===
                  'AbortError'
              ) {
                return;
              }

              setSaveStatus(
                'error'
              );

              setActionError(
                error instanceof
                  Error
                  ? error.message
                  : 'Unable to autosave the draft.'
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

      controller.abort();
    };
  }, [
    saveDraft,
    selections,
  ]);

  function getStory(
    storyId: string
  ) {
    return (
      storyById.get(
        storyId
      ) ??
      null
    );
  }

  function getSelection(
    slot: HomepageSlotType,
    position = 0
  ) {
    return (
      selections.find(
        (selection) =>
          selection.slot ===
            slot &&
          selection.position ===
            position
      ) ??
      null
    );
  }

  function setSelection(
    slot: HomepageSlotType,
    position: number,
    story:
      FrontPageStoryOption,
    categoryId:
      | string
      | null = null
  ) {
    setSelections(
      (current) => [
        ...current.filter(
          (selection) =>
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
                slot &&
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
    slot: HomepageSlotType,
    position = 0
  ) {
    setSelections(
      (current) =>
        current.filter(
          (selection) =>
            !(
              selection.slot ===
                slot &&
              selection.position ===
                position
            )
        )
    );
  }

  function slotProps(
    slot: HomepageSlotType,
    position = 0,
    storyOptions:
      FrontPageStoryOption[] =
        stories,
    categoryId:
      | string
      | null = null
  ) {
    const selection =
      getSelection(
        slot,
        position
      );

    return {
      locale,

      stories:
        storyOptions,

      excludedStoryIds:
        selectedStoryIds,

      story:
        selection
          ? getStory(
              selection.storyId
            )
          : null,

      disabled:
        actionBusy,

      onSelect: (
        story:
          FrontPageStoryOption
      ) =>
        setSelection(
          slot,
          position,
          story,
          categoryId
        ),

      onRemove: () =>
        removeSelection(
          slot,
          position
        ),
    };
  }

  async function runConfirmedAction() {
    if (
      !confirmAction ||
      actionBusy
    ) {
      return;
    }

    const action =
      confirmAction;

    setConfirmAction(
      null
    );

    setActionBusy(
      true
    );

    setActionError(
      null
    );

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

    autosaveController
      .current
      ?.abort();

    try {
      if (
        action ===
        'save'
      ) {
        await saveDraft(
          selections
        );
      } else if (
        action ===
        'revert'
      ) {
        setSelections(
          publishedSelections
        );

        await saveDraft(
          publishedSelections
        );
      } else if (
        action ===
        'clear'
      ) {
        setSelections(
          []
        );

        await saveDraft(
          []
        );
      } else {
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
              () => null
            );

        if (
          !response.ok ||
          !Array.isArray(
            data?.placements
          )
        ) {
          throw new Error(
            data?.error ??
              'Unable to publish the homepage layout.'
          );
        }

        setPublishedSelections(
          selections
        );

        setLastSavedAt(
          new Date()
            .toISOString()
        );

        setSaveStatus(
          'saved'
        );

        router.refresh();
      }
    } catch (error) {
      setSaveStatus(
        'error'
      );

      setActionError(
        error instanceof
          Error
          ? error.message
          : 'Unable to update the homepage layout.'
      );
    } finally {
      setActionBusy(
        false
      );
    }
  }

  const previewPlacements =
    useMemo(
      () =>
        selections.flatMap(
          (selection) => {
            const story =
              storyById.get(
                selection.storyId
              );

            if (!story) {
              return [];
            }

            const now =
              new Date()
                .toISOString();

            return [
              {
                id:
                  `draft:${selection.slot}:${selection.position}`,

                slot:
                  selection.slot,

                position:
                  selection.position,

                categoryId:
                  selection.categoryId,

                startsAt:
                  null,

                endsAt:
                  null,

                active:
                  true,

                createdBy:
                  null,

                updatedBy:
                  null,

                createdAt:
                  now,

                updatedAt:
                  now,

                story,
              } satisfies HomepagePlacement,
            ];
          }
        ),
      [
        selections,
        storyById,
      ]
    );

  const confirmedCopy =
    confirmAction
      ? ACTION_COPY[
          confirmAction
        ]
      : null;

  return (
    <>
      <div
        className="
          mt-6
          min-w-0
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            border-b
            border-border
            pb-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div
            className="
              inline-flex
              w-fit
              items-center
              gap-1
              rounded-xl
              bg-surface-muted
              p-1
            "
          >
            <TabButton
              active={
                activeTab ===
                'layout'
              }
              onClick={() =>
                setActiveTab(
                  'layout'
                )
              }
            >
              {locale === 'es'
                ? 'Diseño'
                : 'Layout'}
            </TabButton>

            <TabButton
              active={
                activeTab ===
                'breaking'
              }
              onClick={() =>
                setActiveTab(
                  'breaking'
                )
              }
            >
              {locale === 'es'
                ? 'Última hora'
                : 'Breaking News'}

              {activeBreakingCount >
                0 && (
                <span
                  className="
                    inline-flex
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-breaking
                    px-1.5
                    py-0.5
                    text-[10px]
                    font-bold
                    leading-none
                    text-white
                  "
                >
                  {
                    activeBreakingCount
                  }
                </span>
              )}
            </TabButton>
          </div>

          {activeTab ===
            'layout' && (
            <p
              className="
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'El guardado automático conserva el borrador. Solo Enviar diseño publica.'
                : 'Autosave preserves the draft. Only Submit Layout publishes it.'}
            </p>
          )}
        </div>

        {activeTab ===
          'layout' && (
          <>
            <div
              className="
                sticky
                top-0
                z-30
                -mx-2
                mt-5
                rounded-2xl
                border
                border-border
                bg-white/95
                p-3
                shadow-lg
                shadow-deep/5
                backdrop-blur
                sm:mx-0
                sm:p-4
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  xl:flex-row
                  xl:items-center
                  xl:justify-between
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
                  <SaveStatusIndicator
                    status={
                      saveStatus
                    }
                    locale={
                      locale
                    }
                  />

                  <div className="min-w-0">
                    <p
                      className="
                        text-sm
                        font-semibold
                        text-deep
                      "
                    >
                      {
                        selections.length
                      }{' '}

                      {locale === 'es'
                        ? 'historias seleccionadas'
                        : 'stories selected'}

                      {isDirty && (
                        <span
                          className="
                            ml-2
                            text-primary
                          "
                        >
                          {locale ===
                          'es'
                            ? 'Borrador sin publicar'
                            : 'Unpublished draft'}
                        </span>
                      )}
                    </p>

                    <p
                      className="
                        truncate
                        text-xs
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
                  <ActionButton
                    icon={
                      Save
                    }
                    onClick={() =>
                      setConfirmAction(
                        'save'
                      )
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    {locale === 'es'
                      ? 'Guardar'
                      : 'Save'}
                  </ActionButton>

                  <ActionButton
                    icon={
                      RotateCcw
                    }
                    onClick={() =>
                      setConfirmAction(
                        'revert'
                      )
                    }
                    disabled={
                      actionBusy ||
                      !isDirty
                    }
                  >
                    {locale === 'es'
                      ? 'Revertir'
                      : 'Revert'}
                  </ActionButton>

                  <ActionButton
                    icon={
                      Trash2
                    }
                    onClick={() =>
                      setConfirmAction(
                        'clear'
                      )
                    }
                    disabled={
                      actionBusy ||
                      selections.length ===
                        0
                    }
                    danger
                  >
                    {locale === 'es'
                      ? 'Borrar todo'
                      : 'Clear All'}
                  </ActionButton>

                  <ActionButton
                    icon={
                      Eye
                    }
                    onClick={() =>
                      setPreviewOpen(
                        true
                      )
                    }
                    disabled={
                      actionBusy
                    }
                  >
                    {locale === 'es'
                      ? 'Vista previa'
                      : 'Preview'}
                  </ActionButton>

                  <button
                    type="button"
                    disabled={
                      actionBusy
                    }
                    onClick={() =>
                      setConfirmAction(
                        'publish'
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-primary
                      px-4
                      text-xs
                      font-bold
                      text-white
                      transition-colors
                      hover:bg-primary/90
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-ring
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {actionBusy ? (
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

                    {locale === 'es'
                      ? 'Enviar diseño'
                      : 'Submit Layout'}
                  </button>
                </div>
              </div>
            </div>

            {actionError && (
              <div
                role="alert"
                className="
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
                  {
                    actionError
                  }
                </span>
              </div>
            )}

            <div
              className="
                mt-6
                space-y-6
              "
            >
              <EditorSection
                number="01"
                title={
                  locale === 'es'
                    ? 'Cuadrícula principal'
                    : 'Lead News Grid'
                }
                description={
                  locale === 'es'
                    ? 'Las tres columnas siguen el mismo orden que la portada pública.'
                    : 'The three columns follow the same order as the public homepage.'
                }
              >
                <div
                  className="
                    grid
                    min-w-0
                    gap-5
                    xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.55fr)_minmax(260px,0.72fr)]
                  "
                >
                  <EditorColumn
                    title={
                      locale === 'es'
                        ? 'Más noticias principales'
                        : 'More Top Stories'
                    }
                  >
                    <HomepageSlotCard
                      {...slotProps(
                        'top_left'
                      )}
                      label={
                        locale === 'es'
                          ? 'Historia con imagen'
                          : 'Image Feature'
                      }
                      description={
                        locale === 'es'
                          ? 'Primera historia de la columna izquierda.'
                          : 'First story in the left homepage column.'
                      }
                    />

                    {[
                      0,
                      1,
                      2,
                      3,
                      4,
                      5,
                      6,
                    ].map(
                      (
                        position
                      ) => (
                        <HomepageSlotCard
                          key={`secondary-${position}`}
                          {...slotProps(
                            'secondary',
                            position
                          )}
                          compact
                          label={`${
                            locale ===
                            'es'
                              ? 'Titular'
                              : 'Headline'
                          } ${
                            position +
                            1
                          }`}
                        />
                      )
                    )}
                  </EditorColumn>

                  <EditorColumn
                    title={
                      locale === 'es'
                        ? 'Historia destacada'
                        : 'Featured Story'
                    }
                    emphasized
                  >
                    <HomepageSlotCard
                      {...slotProps(
                        'lead'
                      )}
                      label={
                        locale === 'es'
                          ? 'Historia principal'
                          : 'Lead Story'
                      }
                      description={
                        locale === 'es'
                          ? 'La historia dominante de la portada.'
                          : 'The dominant story on the homepage.'
                      }
                    />

                    <div
                      className="
                        grid
                        min-w-0
                        gap-4
                        2xl:grid-cols-2
                      "
                    >
                      <HomepageSlotCard
                        {...slotProps(
                          'top_right'
                        )}
                        label={
                          locale === 'es'
                            ? 'Titular de apoyo 1'
                            : 'Supporting Headline 1'
                        }
                      />

                      <HomepageSlotCard
                        {...slotProps(
                          'lead_support'
                        )}
                        label={
                          locale === 'es'
                            ? 'Titular de apoyo 2'
                            : 'Supporting Headline 2'
                        }
                      />
                    </div>

                    <EditorSubgroup
                      title={
                        locale === 'es'
                          ? 'Más cobertura'
                          : 'More Coverage'
                      }
                    >
                      <div
                        className="
                          grid
                          min-w-0
                          gap-4
                          2xl:grid-cols-3
                        "
                      >
                        {[
                          0,
                          1,
                          2,
                        ].map(
                          (
                            position
                          ) => (
                            <HomepageSlotCard
                              key={`coverage-${position}`}
                              {...slotProps(
                                'more_coverage',
                                position
                              )}
                              label={`${
                                locale ===
                                'es'
                                  ? 'Cobertura'
                                  : 'Coverage'
                              } ${
                                position +
                                1
                              }`}
                            />
                          )
                        )}
                      </div>
                    </EditorSubgroup>
                  </EditorColumn>

                  <EditorColumn
                    title={
                      locale === 'es'
                        ? 'Destacados, podcast y mundo'
                        : 'Highlights, Podcast + World'
                    }
                  >
                    <HomepageSlotCard
                      {...slotProps(
                        'highlight'
                      )}
                      label={
                        locale === 'es'
                          ? 'Lo más destacado de hoy'
                          : "Today's Highlight"
                      }
                      description={
                        locale === 'es'
                          ? 'Esta posición se elige manualmente.'
                          : 'This position is selected manually.'
                      }
                    />

                    <StaticLayoutCard
                      locale={
                        locale
                      }
                    />

                    <EditorSubgroup
                      title={
                        locale === 'es'
                          ? 'Cobertura mundial'
                          : 'World Coverage'
                      }
                    >
                      <div className="space-y-4">
                        {[
                          0,
                          1,
                        ].map(
                          (
                            position
                          ) => (
                            <HomepageSlotCard
                              key={`world-${position}`}
                              {...slotProps(
                                'world',
                                position,
                                safeWorldStories
                              )}
                              label={`${
                                locale ===
                                'es'
                                  ? 'Historia mundial'
                                  : 'World Story'
                              } ${
                                position +
                                1
                              }`}
                              description={
                                locale ===
                                'es'
                                  ? 'Elige manualmente una historia publicada en Mundo.'
                                  : 'Manually choose a published World story.'
                              }
                            />
                          )
                        )}
                      </div>
                    </EditorSubgroup>
                  </EditorColumn>
                </div>
              </EditorSection>

              <EditorSection
                number="02"
                title={
                  locale === 'es'
                    ? 'Últimas noticias'
                    : 'Latest News'
                }
                description={
                  locale === 'es'
                    ? 'Elige manualmente las ocho historias de esta sección.'
                    : 'Choose all eight stories in this section manually.'
                }
              >
                <div
                  className="
                    grid
                    min-w-0
                    gap-4
                    md:grid-cols-2
                    2xl:grid-cols-4
                  "
                >
                  {Array.from(
                    {
                      length:
                        8,
                    },
                    (
                      _,
                      position
                    ) => (
                      <HomepageSlotCard
                        key={`latest-${position}`}
                        {...slotProps(
                          'latest_news',
                          position
                        )}
                        label={`${
                          locale ===
                          'es'
                            ? 'Noticia'
                            : 'Story'
                        } ${
                          position +
                          1
                        }`}
                      />
                    )
                  )}
                </div>
              </EditorSection>

              <EditorSection
                number="03"
                title={
                  locale === 'es'
                    ? 'Selección editorial'
                    : "Editors' Picks"
                }
              >
                <div
                  className="
                    grid
                    min-w-0
                    gap-4
                    md:grid-cols-3
                  "
                >
                  {[
                    0,
                    1,
                    2,
                  ].map(
                    (
                      position
                    ) => (
                      <HomepageSlotCard
                        key={`pick-${position}`}
                        {...slotProps(
                          'editors_pick',
                          position
                        )}
                        label={`${
                          locale ===
                          'es'
                            ? 'Selección'
                            : 'Pick'
                        } ${
                          position +
                          1
                        }`}
                      />
                    )
                  )}
                </div>
              </EditorSection>

              <EditorSection
                number="04"
                title={
                  locale === 'es'
                    ? 'Contenido destacado'
                    : 'Featured Content'
                }
              >
                <div
                  className="
                    grid
                    min-w-0
                    gap-4
                    lg:grid-cols-2
                  "
                >
                  <HomepageSlotCard
                    {...slotProps(
                      'latest_feature'
                    )}
                    label={
                      locale === 'es'
                        ? 'Historia destacada'
                        : 'Featured Story'
                    }
                  />

                  <HomepageSlotCard
                    {...slotProps(
                      'video_feature'
                    )}
                    label={
                      locale === 'es'
                        ? 'Video destacado'
                        : 'Video Feature'
                    }
                  />
                </div>
              </EditorSection>

              <EditorSection
                number="05"
                title={
                  locale === 'es'
                    ? 'Secciones'
                    : 'Section Features'
                }
                description={
                  locale === 'es'
                    ? 'Elige una historia principal para cada categoría editorial activa.'
                    : 'Choose one lead story for every active editorial category.'
                }
              >
                <SectionFeaturesEditor
                  locale={
                    locale
                  }
                  categories={
                    categories
                  }
                  stories={
                    stories
                  }
                  selections={
                    selections
                  }
                  excludedStoryIds={
                    selectedStoryIds
                  }
                  disabled={
                    actionBusy
                  }
                  getStory={
                    getStory
                  }
                  onSelect={(
                    position,
                    categoryId,
                    story
                  ) =>
                    setSelection(
                      'section_feature',
                      position,
                      story,
                      categoryId
                    )
                  }
                  onRemove={(
                    position
                  ) =>
                    removeSelection(
                      'section_feature',
                      position
                    )
                  }
                />
              </EditorSection>

              <EditorSection
                number="06"
                title={
                  locale === 'es'
                    ? 'A través de las islas'
                    : 'Across the Islands'
                }
                description={
                  locale === 'es'
                    ? 'Cada isla tiene una historia principal y tres titulares adicionales.'
                    : 'Each island has one lead story and three additional headlines.'
                }
              >
                <div
                  className="
                    grid
                    min-w-0
                    gap-5
                    xl:grid-cols-3
                  "
                >
                  {[
                    {
                      name:
                        'San Andrés',

                      start:
                        0,
                    },

                    {
                      name:
                        'Old Providence',

                      start:
                        4,
                    },

                    {
                      name:
                        'Saint Catalina',

                      start:
                        8,
                    },
                  ].map(
                    (
                      island
                    ) => (
                      <EditorGroup
                        key={
                          island.name
                        }
                        title={
                          island.name
                        }
                        inset
                      >
                        <div className="space-y-4">
                          {Array.from(
                            {
                              length:
                                4,
                            },
                            (
                              _,
                              offset
                            ) => {
                              const position =
                                island.start +
                                offset;

                              return (
                                <HomepageSlotCard
                                  key={`island-${position}`}
                                  {...slotProps(
                                    'island_feature',
                                    position
                                  )}
                                  label={
                                    offset ===
                                    0
                                      ? locale ===
                                        'es'
                                        ? 'Historia principal'
                                        : 'Lead Story'
                                      : `${
                                          locale ===
                                          'es'
                                            ? 'Titular'
                                            : 'Headline'
                                        } ${offset}`
                                  }
                                />
                              );
                            }
                          )}
                        </div>
                      </EditorGroup>
                    )
                  )}
                </div>
              </EditorSection>
            </div>
          </>
        )}

        {activeTab ===
          'breaking' && (
          <div className="mt-6">
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
          </div>
        )}
      </div>

      {previewOpen && (
        <FrontPagePreview
          dict={dict}
          locale={locale}
          placements={
            previewPlacements
          }
          breakingNews={
            breakingNews
          }
          latestStories={
            stories
          }
          worldStories={
            safeWorldStories
          }
          acrossTheIslands={
            acrossTheIslands
          }
          onClose={() =>
            setPreviewOpen(
              false
            )
          }
        />
      )}

      <AlertDialog
        open={
          confirmAction !==
          null
        }
        onOpenChange={(
          open
        ) =>
          !open &&
          setConfirmAction(
            null
          )
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmedCopy &&
                (locale ===
                'es'
                  ? confirmedCopy.titleEs
                  : confirmedCopy.titleEn)}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {confirmedCopy &&
                (locale ===
                'es'
                  ? confirmedCopy.descriptionEs
                  : confirmedCopy.descriptionEn)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {locale === 'es'
                ? 'Cancelar'
                : 'Cancel'}
            </AlertDialogCancel>

            <AlertDialogAction
              className={
                confirmedCopy
                  ?.destructive
                  ? 'bg-breaking text-white hover:bg-breaking/90'
                  : ''
              }
              onClick={() =>
                void runConfirmedAction()
              }
            >
              {confirmedCopy &&
                (locale ===
                'es'
                  ? confirmedCopy.confirmEs
                  : confirmedCopy.confirmEn)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SaveStatusIndicator({
  status,
  locale,
}: {
  status: SaveStatus;
  locale: Locale;
}) {
  if (
    status ===
    'saving'
  ) {
    return (
      <Loader2
        className="
          h-5
          w-5
          shrink-0
          animate-spin
          text-primary
        "
        aria-label={
          locale === 'es'
            ? 'Guardando'
            : 'Saving'
        }
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
          h-5
          w-5
          shrink-0
          text-emerald-600
        "
        aria-label={
          locale === 'es'
            ? 'Guardado'
            : 'Saved'
        }
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
          h-5
          w-5
          shrink-0
          text-breaking
        "
        aria-label={
          locale === 'es'
            ? 'Error al guardar'
            : 'Save error'
        }
      />
    );
  }

  return (
    <Cloud
      className="
        h-5
        w-5
        shrink-0
        text-muted-foreground
      "
      aria-hidden
    />
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  icon: typeof Save;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={`
        inline-flex
        h-10
        items-center
        justify-center
        gap-2
        rounded-lg
        border
        bg-white
        px-3
        text-xs
        font-semibold
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${
          danger
            ? 'border-breaking/20 text-breaking hover:bg-breaking/5 focus-visible:ring-breaking/30'
            : 'border-border text-deep hover:bg-surface-muted focus-visible:ring-ring'
        }
      `}
    >
      <Icon
        className="
          h-4
          w-4
        "
        aria-hidden
      />

      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        inline-flex
        items-center
        gap-2
        rounded-lg
        px-4
        py-2
        text-sm
        font-semibold
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        ${
          active
            ? 'bg-white text-deep shadow-sm'
            : 'text-muted-foreground hover:text-deep'
        }
      `}
    >
      {children}
    </button>
  );
}

function EditorSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children:
    React.ReactNode;
}) {
  return (
    <section
      className="
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-surface-muted/25
      "
    >
      <header
        className="
          flex
          flex-col
          gap-3
          border-b
          border-border
          bg-white
          p-5
          sm:flex-row
          sm:items-start
          sm:gap-4
          xl:p-6
        "
      >
        <span
          className="
            inline-flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-deep
            text-xs
            font-bold
            text-white
          "
        >
          {number}
        </span>

        <div className="min-w-0">
          <h2
            className="
              font-headline
              text-xl
              font-bold
              tracking-tight
              text-deep
            "
          >
            {title}
          </h2>

          {description && (
            <p
              className="
                mt-1
                max-w-4xl
                text-sm
                leading-6
                text-muted-foreground
              "
            >
              {description}
            </p>
          )}
        </div>
      </header>

      <div
        className="
          min-w-0
          p-4
          sm:p-5
          xl:p-6
        "
      >
        {children}
      </div>
    </section>
  );
}

function EditorColumn({
  title,
  emphasized = false,
  children,
}: {
  title: string;
  emphasized?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className={`
        min-w-0
        space-y-4
        rounded-xl
        border
        p-4
        ${
          emphasized
            ? 'border-primary/30 bg-primary/[0.025]'
            : 'border-border bg-white/70'
        }
      `}
    >
      <h3
        className="
          border-b
          border-border
          pb-3
          text-[11px]
          font-bold
          uppercase
          tracking-[0.14em]
          text-deep
        "
      >
        {title}
      </h3>

      {children}
    </div>
  );
}

function EditorSubgroup({
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
        min-w-0
        border-t
        border-border
        pt-4
      "
    >
      <h4
        className="
          mb-3
          text-[10px]
          font-bold
          uppercase
          tracking-[0.14em]
          text-muted-foreground
        "
      >
        {title}
      </h4>

      {children}
    </div>
  );
}

function StaticLayoutCard({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-border
        bg-surface-muted/45
        p-4
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <span
          className="
            inline-flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-deep
            text-white
          "
        >
          <Headphones
            className="
              h-4
              w-4
            "
            aria-hidden
          />
        </span>

        <div className="min-w-0">
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Último podcast'
              : 'Latest Podcast'}
          </p>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Este bloque conserva su posición entre Destacados y Cobertura mundial.'
              : 'This block keeps its homepage position between Highlights and World Coverage.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function EditorGroup({
  title,
  inset = false,
  children,
}: {
  title: string;
  inset?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className={`
        min-w-0
        ${
          inset
            ? 'rounded-xl border border-border bg-white/60 p-4'
            : 'border-b border-border pb-6 last:border-b-0 last:pb-0 [&+&]:pt-6'
        }
      `}
    >
      <h3
        className="
          mb-3
          text-[11px]
          font-bold
          uppercase
          tracking-[0.14em]
          text-deep
        "
      >
        {title}
      </h3>

      {children}
    </div>
  );
}