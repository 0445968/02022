'use client';

import {
  AlertTriangle,
  LayoutGrid,
  Newspaper,
} from 'lucide-react';
import {
  useState,
} from 'react';

import type {
  Locale,
} from '@/types';

export type FrontPageWorkspaceTab =
  | 'layout'
  | 'headline-bar'
  | 'breaking-news';

interface FrontPageWorkspaceProps {
  locale: Locale;

  layoutContent:
    React.ReactNode;

  headlineBarContent:
    React.ReactNode;

  breakingNewsContent:
    React.ReactNode;

  layoutAssignedSlots: number;
  layoutTotalSlots: number;
  layoutChangeCount: number;

  headlineBarAssignedSlots: number;
  headlineBarTotalSlots: number;
  headlineBarChangeCount: number;

  activeBreakingCount: number;

  defaultTab?:
    FrontPageWorkspaceTab;
}

export function FrontPageWorkspace({
  locale,
  layoutContent,
  headlineBarContent,
  breakingNewsContent,
  layoutAssignedSlots,
  layoutTotalSlots,
  layoutChangeCount,
  headlineBarAssignedSlots,
  headlineBarTotalSlots,
  headlineBarChangeCount,
  activeBreakingCount,
  defaultTab = 'layout',
}: FrontPageWorkspaceProps) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<FrontPageWorkspaceTab>(
      defaultTab
    );

  return (
    <div
      className="
        min-w-0
      "
    >
      <FrontPageWorkspaceNav
        locale={
          locale
        }
        activeTab={
          activeTab
        }
        onChangeTab={
          setActiveTab
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
      />

      <div
        className="
          min-w-0
          px-4
          pb-10
          pt-6
          sm:px-6
        "
      >
        {activeTab ===
          'layout' &&
          layoutContent}

        {activeTab ===
          'headline-bar' &&
          headlineBarContent}

        {activeTab ===
          'breaking-news' &&
          breakingNewsContent}
      </div>
    </div>
  );
}

interface FrontPageWorkspaceNavProps {
  locale: Locale;

  activeTab:
    FrontPageWorkspaceTab;

  onChangeTab: (
    tab:
      FrontPageWorkspaceTab
  ) => void;

  layoutAssignedSlots: number;
  layoutTotalSlots: number;
  layoutChangeCount: number;

  headlineBarAssignedSlots: number;
  headlineBarTotalSlots: number;
  headlineBarChangeCount: number;

  activeBreakingCount: number;
}

function FrontPageWorkspaceNav({
  locale,
  activeTab,
  onChangeTab,
  layoutAssignedSlots,
  layoutTotalSlots,
  layoutChangeCount,
  headlineBarAssignedSlots,
  headlineBarTotalSlots,
  headlineBarChangeCount,
  activeBreakingCount,
}: FrontPageWorkspaceNavProps) {
  return (
    <div
      className="
        border-b
        border-border
        bg-surface-muted/35
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-1
          overflow-x-auto
          px-4
          sm:px-6
        "
      >
        <WorkspaceTabButton
          active={
            activeTab ===
            'layout'
          }
          onClick={() =>
            onChangeTab(
              'layout'
            )
          }
          icon={
            LayoutGrid
          }
          label={
            locale === 'es'
              ? 'Diseño'
              : 'Layout'
          }
          assignedSlots={
            layoutAssignedSlots
          }
          totalSlots={
            layoutTotalSlots
          }
          changeCount={
            layoutChangeCount
          }
          locale={
            locale
          }
        />

        <WorkspaceTabButton
          active={
            activeTab ===
            'headline-bar'
          }
          onClick={() =>
            onChangeTab(
              'headline-bar'
            )
          }
          icon={
            Newspaper
          }
          label={
            locale === 'es'
              ? 'Barra de titulares'
              : 'Headline Bar'
          }
          assignedSlots={
            headlineBarAssignedSlots
          }
          totalSlots={
            headlineBarTotalSlots
          }
          changeCount={
            headlineBarChangeCount
          }
          locale={
            locale
          }
        />

        <WorkspaceTabButton
          active={
            activeTab ===
            'breaking-news'
          }
          onClick={() =>
            onChangeTab(
              'breaking-news'
            )
          }
          icon={
            AlertTriangle
          }
          label={
            locale === 'es'
              ? 'Última hora'
              : 'Breaking News'
          }
          badgeCount={
            activeBreakingCount
          }
          locale={
            locale
          }
        />
      </div>
    </div>
  );
}

interface WorkspaceTabButtonProps {
  active: boolean;

  onClick: () => void;

  icon:
    typeof LayoutGrid;

  label: string;

  assignedSlots?: number;
  totalSlots?: number;

  changeCount?: number;

  badgeCount?: number;

  locale: Locale;
}

function WorkspaceTabButton({
  active,
  onClick,
  icon: Icon,
  label,
  assignedSlots,
  totalSlots,
  changeCount = 0,
  badgeCount,
  locale,
}: WorkspaceTabButtonProps) {
  const hasSlotCount =
    typeof assignedSlots ===
      'number' &&
    typeof totalSlots ===
      'number';

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        relative
        flex
        min-h-[58px]
        shrink-0
        items-center
        gap-3
        border-b-2
        px-3
        text-left
        transition-colors
        ${
          active
            ? 'border-primary bg-white text-deep'
            : 'border-transparent text-muted-foreground hover:bg-white/60 hover:text-deep'
        }
      `}
    >
      <Icon
        className="
          h-4
          w-4
          shrink-0
        "
        aria-hidden
      />

      <div
        className="
          flex
          min-w-0
          flex-col
        "
      >
        <span
          className="
            whitespace-nowrap
            text-xs
            font-bold
          "
        >
          {label}
        </span>

        {hasSlotCount && (
          <span
            className="
              mt-0.5
              whitespace-nowrap
              text-[10px]
              font-medium
              text-muted-foreground
            "
          >
            {
              assignedSlots
            }
            /
            {
              totalSlots
            }{' '}
            {locale === 'es'
              ? 'espacios'
              : 'slots'}
          </span>
        )}
      </div>

      {changeCount >
        0 && (
        <span
          className="
            inline-flex
            min-w-5
            items-center
            justify-center
            rounded-full
            bg-primary
            px-1.5
            py-0.5
            text-[10px]
            font-bold
            leading-none
            text-white
          "
          title={
            locale === 'es'
              ? `${changeCount} cambios sin publicar`
              : `${changeCount} unpublished changes`
          }
        >
          {
            changeCount
          }
        </span>
      )}

      {typeof badgeCount ===
        'number' &&
        badgeCount > 0 && (
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
              badgeCount
            }
          </span>
        )}
    </button>
  );
}