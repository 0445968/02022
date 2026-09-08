'use client';

import type {
  HomepageSlotType,
} from '@/lib/db/database.types';
import type {
  FrontPageStoryOption,
  HomepageLayoutSelection,
} from '@/lib/services/front-page';
import type {
  Locale,
} from '@/types';

import {
  HomepageSlotCard,
} from '@/components/editorial/front-page/HomepageSlotCard';

interface EditorsPicksEditorProps {
  locale: Locale;

  stories:
    FrontPageStoryOption[];

  excludedStoryIds:
    string[];

  disabled?: boolean;

  getStory: (
    storyId: string
  ) =>
    FrontPageStoryOption | null;

  getSelection: (
    slot:
      HomepageSlotType,
    position?: number
  ) =>
    HomepageLayoutSelection | null;

  onSelect: (
    slot:
      HomepageSlotType,
    position: number,
    story:
      FrontPageStoryOption
  ) => void;

  onRemove: (
    slot:
      HomepageSlotType,
    position?: number
  ) => void;
}

export function EditorsPicksEditor({
  locale,
  stories,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: EditorsPicksEditorProps) {
  function slotProps(
    position: number
  ) {
    const selection =
      getSelection(
        'editors_pick',
        position
      );

    return {
      locale,

      stories,

      excludedStoryIds,

      story:
        selection
          ? getStory(
              selection.storyId
            )
          : null,

      disabled,

      onSelect: (
        story:
          FrontPageStoryOption
      ) =>
        onSelect(
          'editors_pick',
          position,
          story
        ),

      onRemove: () =>
        onRemove(
          'editors_pick',
          position
        ),
    };
  }

  return (
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
              position
            )}
            label={`${
              locale === 'es'
                ? 'Selección'
                : 'Pick'
            } ${
              position + 1
            }`}
          />
        )
      )}
    </div>
  );
}