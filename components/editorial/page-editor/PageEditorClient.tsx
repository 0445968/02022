'use client';

import {
  useCallback,
  useState,
} from 'react';
import {
  useRouter,
} from 'next/navigation';

import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepageLayoutDraft,
  HomepagePlacement,
} from '@/lib/services/front-page';
import type {
  Locale,
} from '@/types';
import type {
  Category,
} from '@/types/editorial';

import {
  PageEditor,
  type PageEditorPage,
} from './PageEditor';
import {
  FrontPageController,
  type FrontPageEditorState,
} from './front-page/FrontPageController';

interface PageEditorClientProps {
  locale: Locale;

  placements:
    HomepagePlacement[];

  layoutDraft:
    HomepageLayoutDraft | null;

  breakingNews:
    BreakingNewsItem[];

  stories:
    FrontPageStoryOption[];

  worldStories:
    FrontPageStoryOption[];

  categories:
    Category[];
}

const EMPTY_FRONT_PAGE_STATE:
  FrontPageEditorState = {
    assignedSlots: 0,
    totalSlots: 0,
    changeCount: 0,
    hasChanges: false,
    busy: false,
  };

export function PageEditorClient({
  locale,
  placements,
  layoutDraft,
  breakingNews,
  stories,
  worldStories,
  categories,
}: PageEditorClientProps) {
  const router =
    useRouter();

  const [
    frontPageState,
    setFrontPageState,
  ] =
    useState<FrontPageEditorState>(
      EMPTY_FRONT_PAGE_STATE
    );

  const [
    historyOpen,
    setHistoryOpen,
  ] =
    useState(false);

  const handleFrontPageStateChange =
    useCallback(
      (
        state:
          FrontPageEditorState
      ) => {
        setFrontPageState(
          state
        );
      },
      []
    );

  const pages:
    PageEditorPage[] = [
      {
        id:
          'front-page',

        label:
          locale === 'es'
            ? 'Portada'
            : 'Front Page',

        assignedSlots:
          frontPageState
            .assignedSlots,

        totalSlots:
          frontPageState
            .totalSlots,

        changeCount:
          frontPageState
            .changeCount,
      },
    ];

  return (
    <>
      <PageEditor
        locale={
          locale
        }
        pages={
          pages
        }
        busy={
          frontPageState.busy
        }
        onPublishAll={() => {
          /*
           * The next step will connect this
           * to the page-controller action API.
           *
           * We deliberately do not publish
           * directly here because this shell
           * does not own the Front Page draft.
           */
        }}
        onRevertAll={() => {
          /*
           * This will also be connected to
           * the controller action API next.
           */
        }}
        onOpenHistory={() =>
          setHistoryOpen(
            true
          )
        }
      >
        {(
          activePageId
        ) => {
          if (
            activePageId ===
            'front-page'
          ) {
            return (
              <FrontPageController
                locale={
                  locale
                }
                placements={
                  placements
                }
                layoutDraft={
                  layoutDraft
                }
                breakingNews={
                  breakingNews
                }
                stories={
                  stories
                }
                worldStories={
                  worldStories
                }
                categories={
                  categories
                }
                onStateChange={
                  handleFrontPageStateChange
                }
              />
            );
          }

          return (
            <div
              className="
                px-4
                py-10
                text-sm
                text-muted-foreground
                sm:px-6
              "
            >
              {locale === 'es'
                ? 'Esta página todavía no está disponible.'
                : 'This page is not available yet.'}
            </div>
          );
        }}
      </PageEditor>

      {historyOpen && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHistoryOpen(
                false
              );
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-editor-history-title"
            className="
              w-full
              max-w-lg
              rounded-2xl
              border
              border-border
              bg-white
              p-5
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div>
                <h2
                  id="page-editor-history-title"
                  className="
                    font-headline
                    text-xl
                    font-bold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'Historial de diseños'
                    : 'Layout History'}
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'El historial y la recuperación de diseños se conectarán después de completar la nueva estructura del editor.'
                    : 'Layout history and recovery will be connected after the new editor structure is complete.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryOpen(
                    false
                  )
                }
                className="
                  rounded-lg
                  border
                  border-border
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-deep
                  hover:bg-surface-muted
                "
              >
                {locale === 'es'
                  ? 'Cerrar'
                  : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}