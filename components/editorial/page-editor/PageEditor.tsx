'use client';

import {
  useMemo,
  useState,
} from 'react';

import type {
  Locale,
} from '@/types';

import {
  PageEditorNav,
  type PageEditorNavItem,
} from './PageEditorNav';
import {
  PageEditorTopBar,
} from './PageEditorTopBar';

export interface PageEditorPage {
  id: string;
  label: string;
  assignedSlots: number;
  totalSlots: number;
  changeCount: number;
}

interface PageEditorProps {
  locale: Locale;

  pages: PageEditorPage[];

  children: (
    activePageId: string
  ) => React.ReactNode;

  busy?: boolean;

  onPublishAll: () => void;

  onRevertAll: () => void;

  onOpenHistory: () => void;
}

export function PageEditor({
  locale,
  pages,
  children,
  busy = false,
  onPublishAll,
  onRevertAll,
  onOpenHistory,
}: PageEditorProps) {
  const initialPageId =
    pages[0]?.id ??
    'front-page';

  const [
    activePageId,
    setActivePageId,
  ] =
    useState(
      initialPageId
    );

  const changedPageCount =
    useMemo(
      () =>
        pages.filter(
          (page) =>
            page.changeCount >
            0
        ).length,
      [pages]
    );

  const navPages =
    useMemo<
      PageEditorNavItem[]
    >(
      () =>
        pages.map(
          (page) => ({
            id:
              page.id,

            label:
              page.label,

            assignedSlots:
              page.assignedSlots,

            totalSlots:
              page.totalSlots,

            changeCount:
              page.changeCount,
          })
        ),
      [pages]
    );

  const activePageExists =
    pages.some(
      (page) =>
        page.id ===
        activePageId
    );

  const resolvedActivePageId =
    activePageExists
      ? activePageId
      : initialPageId;

  return (
    <div
      className="
        min-h-full
        min-w-0
        bg-background
      "
    >
      <PageEditorTopBar
        locale={
          locale
        }
        changedPageCount={
          changedPageCount
        }
        busy={
          busy
        }
        onPublishAll={
          onPublishAll
        }
        onRevertAll={
          onRevertAll
        }
        onOpenHistory={
          onOpenHistory
        }
      />

      <PageEditorNav
        locale={
          locale
        }
        activePageId={
          resolvedActivePageId
        }
        pages={
          navPages
        }
        onChangePage={
          setActivePageId
        }
      />

      <main
        className="
          min-w-0
        "
      >
        {
          children(
            resolvedActivePageId
          )
        }
      </main>
    </div>
  );
}
