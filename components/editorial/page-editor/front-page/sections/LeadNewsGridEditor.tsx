'use client';

import {
  Headphones,
} from 'lucide-react';

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

interface LeadNewsGridEditorProps {
  locale: Locale;

  stories:
    FrontPageStoryOption[];

  worldStories:
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

export function LeadNewsGridEditor({
  locale,
  stories,
  worldStories,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: LeadNewsGridEditorProps) {
  function slotProps(
    slot:
      HomepageSlotType,
    position = 0,
    storyOptions:
      FrontPageStoryOption[] =
        stories
  ) {
    const selection =
      getSelection(
        slot,
        position
      );

    return {
      locale,

      stories:
        storyOptions,

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
          position,
          story
        ),

      onRemove: () =>
        onRemove(
          slot,
          position
        ),
    };
  }

  return (
    <div
      className="
        grid
        min-w-0
        gap-5
        xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.55fr)_minmax(260px,0.72fr)]
      "
    >
      <EditorColumn
        title={
          locale === 'es'
            ? 'Más noticias principales'
            : 'More Top Stories'
        }
      >
        <HomepageSlotCard
          {...slotProps(
            'top_left'
          )}
          label={
            locale === 'es'
              ? 'Historia con imagen'
              : 'Image Feature'
          }
          description={
            locale === 'es'
              ? 'Primera historia de la columna izquierda.'
              : 'First story in the left homepage column.'
          }
        />

        {[
          0,
          1,
          2,
          3,
          4,
          5,
          6,
        ].map(
          (
            position
          ) => (
            <HomepageSlotCard
              key={`secondary-${position}`}
              {...slotProps(
                'secondary',
                position
              )}
              compact
              label={`${
                locale === 'es'
                  ? 'Titular'
                  : 'Headline'
              } ${
                position + 1
              }`}
            />
          )
        )}
      </EditorColumn>

      <EditorColumn
        title={
          locale === 'es'
            ? 'Historia destacada'
            : 'Featured Story'
        }
        emphasized
      >
        <HomepageSlotCard
          {...slotProps(
            'lead'
          )}
          label={
            locale === 'es'
              ? 'Historia principal'
              : 'Lead Story'
          }
          description={
            locale === 'es'
              ? 'La historia dominante de la portada.'
              : 'The dominant story on the homepage.'
          }
        />

        <div
          className="
            grid
            min-w-0
            gap-4
            2xl:grid-cols-2
          "
        >
          <HomepageSlotCard
            {...slotProps(
              'top_right'
            )}
            label={
              locale === 'es'
                ? 'Titular de apoyo 1'
                : 'Supporting Headline 1'
            }
          />

          <HomepageSlotCard
            {...slotProps(
              'lead_support'
            )}
            label={
              locale === 'es'
                ? 'Titular de apoyo 2'
                : 'Supporting Headline 2'
            }
          />
        </div>

        <EditorSubgroup
          title={
            locale === 'es'
              ? 'Más cobertura'
              : 'More Coverage'
          }
        >
          <div
            className="
              grid
              min-w-0
              gap-4
              2xl:grid-cols-3
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
                  key={`coverage-${position}`}
                  {...slotProps(
                    'more_coverage',
                    position
                  )}
                  label={`${
                    locale === 'es'
                      ? 'Cobertura'
                      : 'Coverage'
                  } ${
                    position + 1
                  }`}
                />
              )
            )}
          </div>
        </EditorSubgroup>
      </EditorColumn>

      <EditorColumn
        title={
          locale === 'es'
            ? 'Destacados, podcast y mundo'
            : 'Highlights, Podcast + World'
        }
      >
        <HomepageSlotCard
          {...slotProps(
            'highlight'
          )}
          label={
            locale === 'es'
              ? 'Lo más destacado de hoy'
              : "Today's Highlight"
          }
          description={
            locale === 'es'
              ? 'Esta posición se elige manualmente.'
              : 'This position is selected manually.'
          }
        />

        <StaticLayoutCard
          locale={
            locale
          }
        />

        <EditorSubgroup
          title={
            locale === 'es'
              ? 'Cobertura mundial'
              : 'World Coverage'
          }
        >
          <div
            className="
              space-y-4
            "
          >
            {[
              0,
              1,
            ].map(
              (
                position
              ) => (
                <HomepageSlotCard
                  key={`world-${position}`}
                  {...slotProps(
                    'world',
                    position,
                    worldStories
                  )}
                  label={`${
                    locale === 'es'
                      ? 'Historia mundial'
                      : 'World Story'
                  } ${
                    position + 1
                  }`}
                  description={
                    locale === 'es'
                      ? 'Elige manualmente una historia publicada en Mundo.'
                      : 'Manually choose a published World story.'
                  }
                />
              )
            )}
          </div>
        </EditorSubgroup>
      </EditorColumn>
    </div>
  );
}

function EditorColumn({
  title,
  emphasized = false,
  children,
}: {
  title: string;
  emphasized?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className={`
        min-w-0
        space-y-4
        rounded-xl
        border
        p-4
        ${
          emphasized
            ? 'border-primary/30 bg-primary/[0.025]'
            : 'border-border bg-white/70'
        }
      `}
    >
      <h3
        className="
          border-b
          border-border
          pb-3
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

function EditorSubgroup({
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
        border-t
        border-border
        pt-4
      "
    >
      <h4
        className="
          mb-3
          text-[10px]
          font-bold
          uppercase
          tracking-[0.14em]
          text-muted-foreground
        "
      >
        {title}
      </h4>

      {children}
    </div>
  );
}

function StaticLayoutCard({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-border
        bg-surface-muted/45
        p-4
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        <span
          className="
            inline-flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-deep
            text-white
          "
        >
          <Headphones
            className="
              h-4
              w-4
            "
            aria-hidden
          />
        </span>

        <div
          className="
            min-w-0
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
              ? 'Último podcast'
              : 'Latest Podcast'}
          </p>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Este bloque conserva su posición entre Destacados y Cobertura mundial.'
              : 'This block keeps its homepage position between Highlights and World Coverage.'}
          </p>
        </div>
      </div>
    </div>
  );
}