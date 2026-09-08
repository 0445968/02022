'use client';

import type {
  FrontPageStoryOption,
} from '@/lib/services/front-page';
import type {
  Locale,
} from '@/types';

import {
  HomepageSlotCard,
} from '@/components/editorial/front-page/HomepageSlotCard';

interface HeadlineBarEditorProps {
  locale: Locale;

  stories:
    FrontPageStoryOption[];

  selectedStories:
    Array<
      FrontPageStoryOption | null
    >;

  excludedStoryIds:
    string[];

  disabled?: boolean;

  onSelect: (
    position: number,
    story:
      FrontPageStoryOption
  ) => void;

  onRemove: (
    position: number
  ) => void;
}

const HEADLINE_BAR_SLOTS = [
  0,
  1,
  2,
  3,
  4,
];

export function HeadlineBarEditor({
  locale,
  stories,
  selectedStories,
  excludedStoryIds,
  disabled = false,
  onSelect,
  onRemove,
}: HeadlineBarEditorProps) {
  const previewStories =
    selectedStories.filter(
      (
        story
      ): story is FrontPageStoryOption =>
        Boolean(
          story
        )
    );

  return (
    <div
      className="
        min-w-0
        space-y-6
      "
    >
      <div
        className="
          rounded-2xl
          border
          border-border
          bg-white
          p-4
          sm:p-5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-2
          "
        >
          <h2
            className="
              text-sm
              font-bold
              text-deep
            "
          >
            {locale === 'es'
              ? 'Vista previa de la barra'
              : 'Headline Bar Preview'}
          </h2>

          <p
            className="
              text-xs
              leading-5
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'La barra utiliza el título corto de cada historia cuando está disponible.'
              : 'The bar uses each story’s short title when available.'}
          </p>
        </div>

        <div
          className="
            mt-4
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-surface-muted/30
          "
        >
          {previewStories.length >
          0 ? (
            <div
              className="
                flex
                min-h-11
                items-center
                gap-0
                overflow-x-auto
                whitespace-nowrap
                px-4
              "
            >
              {previewStories.map(
                (
                  story,
                  index
                ) => (
                  <div
                    key={
                      story.id
                    }
                    className="
                      flex
                      shrink-0
                      items-center
                    "
                  >
                    {index >
                      0 && (
                      <span
                        className="
                          mx-3
                          text-border
                        "
                        aria-hidden
                      >
                        /
                      </span>
                    )}

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-deep
                      "
                    >
                      {story.shortTitle
                        ?.trim() ||
                        story.headline}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div
              className="
                flex
                min-h-11
                items-center
                px-4
                text-xs
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Selecciona historias para ver la vista previa.'
                : 'Select stories to preview the headline bar.'}
            </div>
          )}
        </div>
      </div>

      <div
        className="
          grid
          min-w-0
          gap-4
          lg:grid-cols-2
          2xl:grid-cols-5
        "
      >
        {HEADLINE_BAR_SLOTS.map(
          (
            position
          ) => {
            const story =
              selectedStories[
                position
              ] ?? null;

            return (
              <HomepageSlotCard
                key={`headline-bar-${position}`}
                locale={
                  locale
                }
                label={`${
                  locale === 'es'
                    ? 'Titular'
                    : 'Headline'
                } ${
                  position +
                  1
                }`}
                description={
                  locale === 'es'
                    ? 'Historia mostrada en la barra debajo de la navegación principal.'
                    : 'Story shown in the bar below the main site navigation.'
                }
                stories={
                  stories
                }
                excludedStoryIds={
                  excludedStoryIds
                }
                story={
                  story
                }
                disabled={
                  disabled
                }
                compact
                onSelect={(
                  nextStory
                ) =>
                  onSelect(
                    position,
                    nextStory
                  )
                }
                onRemove={() =>
                  onRemove(
                    position
                  )
                }
              />
            );
          }
        )}
      </div>
    </div>
  );
}