'use client';

import { useMemo } from 'react';

import type { Locale } from '@/types';
import type { Category } from '@/types/editorial';

import type {
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import { HomepageSlotCard } from './HomepageSlotCard';

interface SectionFeaturesEditorProps {
  locale: Locale;

  categories: Category[];
  stories: FrontPageStoryOption[];
  placements: HomepagePlacement[];

  userId: string | null;

  onChanged?: () => void;
}

export function SectionFeaturesEditor({
  locale,
  categories,
  stories,
  placements,
  userId,
  onChanged,
}: SectionFeaturesEditorProps) {
  const visibleCategories =
    useMemo(
      () =>
        [...categories]
          .filter(
            (category) =>
              category.active
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder
          ),
      [categories]
    );

  const placementByCategory =
    useMemo(() => {
      const map =
        new Map<
          string,
          HomepagePlacement
        >();

      for (
        const placement of
        placements
      ) {
        if (
          placement.categoryId
        ) {
          map.set(
            placement.categoryId,
            placement
          );
        }
      }

      return map;
    }, [placements]);

  if (
    visibleCategories.length ===
    0
  ) {
    return (
      <div
        className="
          rounded-xl
          border
          border-dashed
          border-border
          bg-white
          px-5
          py-10
          text-center
        "
      >
        <p
          className="
            text-sm
            font-semibold
            text-deep
          "
        >
          {locale === 'es'
            ? 'No hay categorías activas'
            : 'No active categories'}
        </p>

        <p
          className="
            mt-1
            text-xs
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Activa una categoría antes de asignarle una historia destacada.'
            : 'Activate a category before assigning it a featured story.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        grid
        gap-4
        md:grid-cols-2
      "
    >
      {visibleCategories.map(
        (
          category,
          index
        ) => {
          const placement =
            placementByCategory.get(
              category.id
            ) ?? null;

          const categoryName =
            locale === 'es'
              ? category.nameEs
              : category.nameEn;

          return (
            <HomepageSlotCard
              key={
                category.id
              }
              locale={
                locale
              }
              slot="section_feature"
              label={
                categoryName
              }
              description={
                locale === 'es'
                  ? 'Historia principal seleccionada para esta sección.'
                  : 'The manually selected lead story for this section.'
              }
              stories={
                stories
              }
              placement={
                placement
              }
              position={
                index
              }
              categoryId={
                category.id
              }
              userId={
                userId
              }
              onChanged={
                onChanged
              }
            />
          );
        }
      )}
    </div>
  );
}