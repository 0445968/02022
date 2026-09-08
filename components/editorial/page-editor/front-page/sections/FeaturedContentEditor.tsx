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

interface FeaturedContentEditorProps {
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

export function FeaturedContentEditor({
  locale,
  stories,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: FeaturedContentEditorProps) {
  function slotProps(
    slot:
      HomepageSlotType
  ) {
    const selection =
      getSelection(
        slot,
        0
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
          slot,
          0,
          story
        ),

      onRemove: () =>
        onRemove(
          slot,
          0
        ),
    };
  }

  return (
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
  );
}