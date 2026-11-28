'use client';
import Link from 'next/link';

import {
  useCallback,
  useRef,
  useState,
} from 'react';
import * as HistoryDialog from '@radix-ui/react-dialog';

import type {VersionedLayout} from '@/lib/permissions/homepage-history-contract';
import {LayoutHistoryPanel} from './LayoutHistoryPanel';
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
  type FrontPageControllerHandle,
} from './front-page/FrontPageController';

interface PageEditorClientProps {
  pollPlacementHref?:string;
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
  versioned=null,
  pollPlacementHref,
  placements,
  layoutDraft,
  breakingNews,
  stories,
  worldStories,
  categories,
}: PageEditorClientProps) {
  const controller=useRef<FrontPageControllerHandle>(null);

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
      {pollPlacementHref&&<div className="flex justify-end border-b border-border px-4 py-2"><Link target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-surface-muted" href={pollPlacementHref}>{locale==='es'?'Ubicaciones de encuestas':'Poll placements'}</Link></div>}
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
        onPublishAll={()=>{void controller.current?.publish();}}
        onRevertAll={()=>{void controller.current?.revert();}}
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
                ref={controller}
                versioned={versioned}
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

      <HistoryDialog.Root open={historyOpen} onOpenChange={setHistoryOpen}>
        <HistoryDialog.Portal>
          <HistoryDialog.Overlay className="fixed inset-0 z-[100] bg-black/40"/>
          <HistoryDialog.Content
            className="fixed left-1/2 top-1/2 z-[101] max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl"
            onCloseAutoFocus={event=>{event.preventDefault();document.getElementById('page-editor-actions')?.focus();}}
          >
            <div className="flex items-start justify-between gap-4">
              <HistoryDialog.Title className="font-headline text-xl font-bold text-deep">
                {locale==='es'?'Historial de diseños':'Layout History'}
              </HistoryDialog.Title>
              <HistoryDialog.Close className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-deep hover:bg-surface-muted">
                {locale==='es'?'Cerrar':'Close'}
              </HistoryDialog.Close>
            </div>
            <HistoryDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {locale==='es'?'Restaurar una versión no cambia la portada publicada.':'Restoring a version does not change the published homepage.'}
            </HistoryDialog.Description>
            {versioned?<LayoutHistoryPanel locale={locale} onRestore={async revision=>{await controller.current?.restore(revision);setHistoryOpen(false);}}/>:
              <p className="mt-2 text-sm text-muted-foreground">{locale==='es'?'El historial de versiones aún no está disponible.':'No version history is available yet.'}</p>}
          </HistoryDialog.Content>
        </HistoryDialog.Portal>
      </HistoryDialog.Root>
    </>
  );
}