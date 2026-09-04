'use client';

import type {
  FrontPageStoryOption,
} from '@/lib/services/front-page';
import type {
  Locale,
} from '@/types';

import {
  HomepageSlotCard,
} from './HomepageSlotCard';

interface HeadlineBarEditorProps {
  locale: Locale;

  stories:
    FrontPageStoryOption[];

  selectedStories: Array<
    FrontPageStoryOption | null
  >;

  excludedStoryIds:
    string[];

  disabled?: boolean;

  onSelect: (
    position: number,
    story: FrontPageStoryOption
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
] as const;

export function HeadlineBarEditor({
  locale,
  stories,
  selectedStories,
  excludedStoryIds,
  disabled = false,
  onSelect,
  onRemove,
}: HeadlineBarEditorProps) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-border
        bg-surface-muted/30
        p-4
        sm:p-5
      "
    >
      <div
        className="
          mb-4
          flex
          flex-col
          gap-1
        "
      >
        <h3
          className="
            text-sm
            font-bold
            text-deep
          "
        >
          {locale === 'es'
            ? 'Barra de titulares'
            : 'Headline Bar'}
        </h3>

        <p
          className="
            max-w-3xl
            text-xs
            leading-5
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Selecciona las historias que aparecerán directamente debajo de la navegación principal. Se mostrará automáticamente el título corto de cada historia, o el titular completo si no tiene uno.'
            : 'Choose the stories that appear directly below the main navigation. Each story automatically uses its short title, or falls back to the full headline when no short title is set.'}
        </p>
      </div>

      <div
        className="
          grid
          min-w-0
          gap-3
          md:grid-cols-2
          xl:grid-cols-5
        "
      >
        {HEADLINE_BAR_SLOTS.map(
          (position) => {
            const story =
              selectedStories[
                position
              ] ?? null;

            return (
              <HomepageSlotCard
                key={`headline-bar-${position}`}
                locale={locale}
                stories={stories}
                excludedStoryIds={
                  excludedStoryIds
                }
                story={story}
                disabled={disabled}
                compact
                label={`${
                  locale === 'es'
                    ? 'Titular'
                    : 'Headline'
                } ${position + 1}`}
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

      <div
        className="
          mt-4
          rounded-xl
          border
          border-dashed
          border-border
          bg-white
          px-4
          py-3
        "
      >
        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.14em]
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Vista de títulos'
            : 'Title preview'}
        </p>

        <div
          className="
            mt-2
            flex
            min-w-0
            gap-4
            overflow-x-auto
            whitespace-nowrap
            pb-1
          "
        >
          {selectedStories.some(
            Boolean
          ) ? (
            selectedStories.map(
              (
                story,
                position
              ) => {
                if (!story) {
                  return null;
                }

                const title =
                  story.shortTitle
                    ?.trim() ||
                  story.headline;

                return (
                  <div
                    key={`headline-preview-${story.id}-${position}`}
                    className="
                      flex
                      shrink-0
                      items-center
                      gap-4
                    "
                  >
                    {position > 0 && (
                      <span
                        className="
                          h-1
                          w-1
                          rounded-full
                          bg-muted-foreground/40
                        "
                        aria-hidden
                      />
                    )}

                    <span
                      className="
                        text-xs
                        font-semibold
                        text-deep
                      "
                    >
                      {title}
                    </span>
                  </div>
                );
              }
            )
          ) : (
            <span
              className="
                text-xs
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Aún no se han seleccionado titulares.'
                : 'No headline stories selected yet.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}