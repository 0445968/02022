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

interface AcrossTheIslandsEditorProps {
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

export function AcrossTheIslandsEditor({
  locale,
  stories,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: AcrossTheIslandsEditorProps) {
  function slotProps(
    position: number
  ) {
    const selection =
      getSelection(
        'island_feature',
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
          'island_feature',
          position,
          story
        ),

      onRemove: () =>
        onRemove(
          'island_feature',
          position
        ),
    };
  }

  const islands = [
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
  ];

  return (
    <div
      className="
        grid
        min-w-0
        gap-5
        xl:grid-cols-3
      "
    >
      {islands.map(
        (
          island
        ) => (
          <IslandGroup
            key={
              island.name
            }
            title={
              island.name
            }
          >
            <div
              className="
                space-y-4
              "
            >
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
          </IslandGroup>
        )
      )}
    </div>
  );
}

function IslandGroup({
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
        rounded-xl
        border
        border-border
        bg-white/60
        p-4
      "
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