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
import type {
  Category,
} from '@/types/editorial';

import {
  FrontPageEditorSection,
} from './FrontPageEditorSection';
import {
  AcrossTheIslandsEditor,
} from './sections/AcrossTheIslandsEditor';
import {
  EditorsPicksEditor,
} from './sections/EditorsPicksEditor';
import {
  FeaturedContentEditor,
} from './sections/FeaturedContentEditor';
import {
  LatestNewsEditor,
} from './sections/LatestNewsEditor';
import {
  LeadNewsGridEditor,
} from './sections/LeadNewsGridEditor';
import {
  SectionFeaturesEditor,
} from './sections/SectionFeaturesEditor';

interface FrontPageLayoutEditorProps {
  locale: Locale;

  stories:
    FrontPageStoryOption[];

  worldStories:
    FrontPageStoryOption[];

  categories:
    Category[];

  selections:
    HomepageLayoutSelection[];

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
      FrontPageStoryOption,
    categoryId?:
      | string
      | null
  ) => void;

  onRemove: (
    slot:
      HomepageSlotType,
    position?: number
  ) => void;
}

export function FrontPageLayoutEditor({
  locale,
  stories,
  worldStories,
  categories,
  selections,
  excludedStoryIds,
  disabled = false,
  getStory,
  getSelection,
  onSelect,
  onRemove,
}: FrontPageLayoutEditorProps) {
  return (
    <div
      className="
        min-w-0
        space-y-6
      "
    >
      <FrontPageEditorSection
        number="01"
        title={
          locale === 'es'
            ? 'Cuadrícula principal'
            : 'Lead News Grid'
        }
        description={
          locale === 'es'
            ? 'Las tres columnas siguen el mismo orden que la portada pública.'
            : 'The three columns follow the same order as the public homepage.'
        }
      >
        <LeadNewsGridEditor
          locale={
            locale
          }
          stories={
            stories
          }
          worldStories={
            worldStories
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          getSelection={
            getSelection
          }
          onSelect={(
            slot,
            position,
            story
          ) =>
            onSelect(
              slot,
              position,
              story
            )
          }
          onRemove={
            onRemove
          }
        />
      </FrontPageEditorSection>

      <FrontPageEditorSection
        number="02"
        title={
          locale === 'es'
            ? 'Últimas noticias'
            : 'Latest News'
        }
        description={
          locale === 'es'
            ? 'Elige manualmente las ocho historias de esta sección.'
            : 'Choose all eight stories in this section manually.'
        }
      >
        <LatestNewsEditor
          locale={
            locale
          }
          stories={
            stories
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          getSelection={
            getSelection
          }
          onSelect={(
            slot,
            position,
            story
          ) =>
            onSelect(
              slot,
              position,
              story
            )
          }
          onRemove={
            onRemove
          }
        />
      </FrontPageEditorSection>

      <FrontPageEditorSection
        number="03"
        title={
          locale === 'es'
            ? 'Selección editorial'
            : "Editors' Picks"
        }
      >
        <EditorsPicksEditor
          locale={
            locale
          }
          stories={
            stories
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          getSelection={
            getSelection
          }
          onSelect={(
            slot,
            position,
            story
          ) =>
            onSelect(
              slot,
              position,
              story
            )
          }
          onRemove={
            onRemove
          }
        />
      </FrontPageEditorSection>

      <FrontPageEditorSection
        number="04"
        title={
          locale === 'es'
            ? 'Contenido destacado'
            : 'Featured Content'
        }
      >
        <FeaturedContentEditor
          locale={
            locale
          }
          stories={
            stories
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          getSelection={
            getSelection
          }
          onSelect={(
            slot,
            position,
            story
          ) =>
            onSelect(
              slot,
              position,
              story
            )
          }
          onRemove={
            onRemove
          }
        />
      </FrontPageEditorSection>

      <FrontPageEditorSection
        number="05"
        title={
          locale === 'es'
            ? 'Secciones'
            : 'Section Features'
        }
        description={
          locale === 'es'
            ? 'Elige una historia principal para cada categoría editorial activa.'
            : 'Choose one lead story for every active editorial category.'
        }
      >
        <SectionFeaturesEditor
          locale={
            locale
          }
          categories={
            categories
          }
          stories={
            stories
          }
          selections={
            selections
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          onSelect={(
            position,
            categoryId,
            story
          ) =>
            onSelect(
              'section_feature',
              position,
              story,
              categoryId
            )
          }
          onRemove={(
            position
          ) =>
            onRemove(
              'section_feature',
              position
            )
          }
        />
      </FrontPageEditorSection>

      <FrontPageEditorSection
        number="06"
        title={
          locale === 'es'
            ? 'A través de las islas'
            : 'Across the Islands'
        }
        description={
          locale === 'es'
            ? 'Cada isla tiene una historia principal y tres titulares adicionales.'
            : 'Each island has one lead story and three additional headlines.'
        }
      >
        <AcrossTheIslandsEditor
          locale={
            locale
          }
          stories={
            stories
          }
          excludedStoryIds={
            excludedStoryIds
          }
          disabled={
            disabled
          }
          getStory={
            getStory
          }
          getSelection={
            getSelection
          }
          onSelect={(
            slot,
            position,
            story
          ) =>
            onSelect(
              slot,
              position,
              story
            )
          }
          onRemove={
            onRemove
          }
        />
      </FrontPageEditorSection>
    </div>
  );
}