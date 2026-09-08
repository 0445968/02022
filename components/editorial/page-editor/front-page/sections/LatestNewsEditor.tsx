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

interface LatestNewsEditorProps {
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

export function LatestNewsEditor({
  locale,
  stories,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: LatestNewsEditorProps) {
  function slotProps(
    position: number
  ) {
    const selection =
      getSelection(
        'latest_news',
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
          'latest_news',
          position,
          story
        ),

      onRemove: () =>
        onRemove(
          'latest_news',
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
        md:grid-cols-2
        2xl:grid-cols-4
      "
    >
      {Array.from(
        {
          length: 8,
        },
        (
          _,
          position
        ) => (
          <HomepageSlotCard
            key={`latest-${position}`}
            {...slotProps(
              position
            )}
            label={`${
              locale === 'es'
                ? 'Noticia'
                : 'Story'
            } ${
              position + 1
            }`}
          />
        )
      )}
    </div>
  );
}