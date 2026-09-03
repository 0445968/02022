'use client';

import { useMemo } from 'react';

import type {
  FrontPageStoryOption,
  HomepageLayoutSelection,
} from '@/lib/services/front-page';
import type { Locale } from '@/types';
import type { Category } from '@/types/editorial';

import { HomepageSlotCard } from './HomepageSlotCard';

interface SectionFeaturesEditorProps {
  locale: Locale;
  categories: Category[];
  stories: FrontPageStoryOption[];
  selections: HomepageLayoutSelection[];
  excludedStoryIds?: string[];
  disabled?: boolean;
  getStory: (storyId: string) => FrontPageStoryOption | null;
  onSelect: (
    position: number,
    categoryId: string,
    story: FrontPageStoryOption
  ) => void;
  onRemove: (position: number) => void;
}

export function SectionFeaturesEditor({
  locale,
  categories,
  stories,
  selections,
  excludedStoryIds = [],
  disabled = false,
  getStory,
  onSelect,
  onRemove,
}: SectionFeaturesEditorProps) {
  const visibleCategories = useMemo(
    () =>
      [...categories]
        .filter((category) => category.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  if (visibleCategories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white px-5 py-10 text-center">
        <p className="text-sm font-semibold text-deep">
          {locale === 'es' ? 'No hay categorías activas' : 'No active categories'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === 'es'
            ? 'Activa una categoría antes de asignarle una historia destacada.'
            : 'Activate a category before assigning it a featured story.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      {visibleCategories.map((category, position) => {
        const selection = selections.find(
          (item) =>
            item.slot === 'section_feature' &&
            item.categoryId === category.id
        );
        const story = selection ? getStory(selection.storyId) : null;
        const categoryName =
          locale === 'es' ? category.nameEs : category.nameEn;

        return (
          <HomepageSlotCard
            key={category.id}
            locale={locale}
            label={categoryName}
            description={
              locale === 'es'
                ? 'Historia principal elegida manualmente para esta sección.'
                : 'The manually selected lead story for this section.'
            }
            stories={stories}
            excludedStoryIds={excludedStoryIds}
            story={story}
            disabled={disabled}
            onSelect={(nextStory) =>
              onSelect(position, category.id, nextStory)
            }
            onRemove={() => onRemove(selection?.position ?? position)}
          />
        );
      })}
    </div>
  );
}
