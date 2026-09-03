'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Globe2, Radio, Sparkles, Zap } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { HomeStory } from '@/lib/services/home';
import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';
import type { Locale } from '@/types';
import type { Category } from '@/types/editorial';

import { BreakingNewsEditor } from './BreakingNewsEditor';
import { FrontPagePreview } from './FrontPagePreview';
import { HomepageSlotCard } from './HomepageSlotCard';
import { SectionFeaturesEditor } from './SectionFeaturesEditor';

interface FrontPageEditorProps {
  dict: Dictionary;
  locale: Locale;
  userId: string | null;
  placements: HomepagePlacement[];
  breakingNews: BreakingNewsItem[];
  stories: FrontPageStoryOption[];
  worldStories: FrontPageStoryOption[];
  categories: Category[];
  acrossTheIslands: {
    sanAndres: HomeStory[];
    oldProvidence: HomeStory[];
    saintCatalina: HomeStory[];
  };
}

type FrontPageTab = 'layout' | 'breaking';

export function FrontPageEditor({
  dict,
  locale,
  userId,
  placements,
  breakingNews,
  stories,
  worldStories,
  categories,
  acrossTheIslands,
}: FrontPageEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FrontPageTab>('layout');
  const [previewOpen, setPreviewOpen] = useState(false);

  const grouped = useMemo(
    () => ({
      lead: placements.filter((item) => item.slot === 'lead'),
      topLeft: placements.filter((item) => item.slot === 'top_left'),
      topRight: placements.filter((item) => item.slot === 'top_right'),
      secondary: placements.filter((item) => item.slot === 'secondary'),
      editorsPick: placements.filter((item) => item.slot === 'editors_pick'),
      latestFeature: placements.filter((item) => item.slot === 'latest_feature'),
      sectionFeature: placements.filter((item) => item.slot === 'section_feature'),
      videoFeature: placements.filter((item) => item.slot === 'video_feature'),
    }),
    [placements]
  );

  const placedStoryIds = useMemo(
    () =>
      placements
        .filter((placement) => placement.active)
        .map((placement) => placement.story.id),
    [placements]
  );

  const activeBreakingCount = breakingNews.filter((item) => item.active).length;

  function getPlacement(list: HomepagePlacement[], position = 0) {
    return list.find((item) => item.position === position) ?? null;
  }

  function handleChanged() {
    router.refresh();
  }

  const slotProps = {
    locale,
    stories,
    excludedStoryIds: placedStoryIds,
    userId,
    onChanged: handleChanged,
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-surface-muted p-1">
            <TabButton
              active={activeTab === 'layout'}
              onClick={() => setActiveTab('layout')}
            >
              {locale === 'es' ? 'Diseño' : 'Layout'}
            </TabButton>

            <TabButton
              active={activeTab === 'breaking'}
              onClick={() => setActiveTab('breaking')}
            >
              {locale === 'es' ? 'Última hora' : 'Breaking News'}
              {activeBreakingCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-breaking px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {activeBreakingCount}
                </span>
              )}
            </TabButton>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {locale === 'es'
                ? `${placements.length} posiciones configuradas`
                : `${placements.length} placements configured`}
            </span>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-deep transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Eye className="h-4 w-4" aria-hidden />
              {locale === 'es' ? 'Vista previa' : 'Preview'}
            </button>
          </div>
        </div>

        {activeTab === 'layout' && (
          <div className="mt-6 space-y-8">
            <EditorSection
              eyebrow={locale === 'es' ? 'Primera sección pública' : 'First public section'}
              title={locale === 'es' ? 'Cuadrícula principal' : 'Lead News Grid'}
              description={
                locale === 'es'
                  ? 'La estructura de tres columnas coincide con la portada pública. Los espacios automáticos se llenan con historias recientes que todavía no aparecen en otro lugar.'
                  : 'This three-column structure matches the public homepage. Automatic spaces use recent stories that have not appeared anywhere else.'
              }
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.55fr)_minmax(260px,0.72fr)]">
                <EditorColumn title={locale === 'es' ? 'Más noticias principales' : 'More Top Stories'}>
                  <HomepageSlotCard
                    {...slotProps}
                    slot="top_left"
                    label={locale === 'es' ? 'Historia con imagen' : 'Image Feature'}
                    description={locale === 'es' ? 'Primera historia de la columna izquierda.' : 'First story in the left column.'}
                    placement={getPlacement(grouped.topLeft)}
                  />

                  {[0, 1, 2].map((position) => (
                    <HomepageSlotCard
                      {...slotProps}
                      key={position}
                      slot="secondary"
                      label={`${locale === 'es' ? 'Titular' : 'Headline'} ${position + 1}`}
                      placement={getPlacement(grouped.secondary, position)}
                      position={position}
                    />
                  ))}
                </EditorColumn>

                <EditorColumn title={locale === 'es' ? 'Historia destacada' : 'Featured Story'} emphasized>
                  <HomepageSlotCard
                    {...slotProps}
                    slot="lead"
                    label={locale === 'es' ? 'Historia principal' : 'Lead Story'}
                    description={locale === 'es' ? 'La historia dominante de toda la portada.' : 'The dominant story on the homepage.'}
                    placement={getPlacement(grouped.lead)}
                  />

                  <HomepageSlotCard
                    {...slotProps}
                    slot="top_right"
                    label={locale === 'es' ? 'Titular de apoyo' : 'Supporting Headline'}
                    placement={getPlacement(grouped.topRight)}
                  />

                  <AutomaticModule
                    locale={locale}
                    title={locale === 'es' ? 'Apoyo y más cobertura' : 'Support + More Coverage'}
                    description={locale === 'es' ? 'Cinco historias únicas se seleccionan automáticamente de las noticias recientes.' : 'Five unique stories are selected automatically from recent news.'}
                  />
                </EditorColumn>

                <EditorColumn title={locale === 'es' ? 'Destacados y mundo' : 'Highlights + World'}>
                  <AutomaticModule
                    locale={locale}
                    title={locale === 'es' ? 'Lo más destacado de hoy' : "Today's Highlights"}
                    description={locale === 'es' ? 'La siguiente historia reciente que aún no se ha utilizado.' : 'The next recent story not already used.'}
                  />

                  <AutomaticModule
                    locale={locale}
                    title={locale === 'es' ? 'Último podcast' : 'Latest Podcast'}
                    description={locale === 'es' ? 'Módulo automático de podcast.' : 'Automatic podcast module.'}
                    icon="radio"
                  />

                  <AutomaticModule
                    locale={locale}
                    title={locale === 'es' ? 'Cobertura mundial' : 'World Coverage'}
                    description={
                      locale === 'es'
                        ? `${worldStories.length} historias publicadas disponibles en Mundo.`
                        : `${worldStories.length} published World stories available.`
                    }
                    icon="world"
                  />
                </EditorColumn>
              </div>
            </EditorSection>

            <AutomaticSection
              locale={locale}
              title={locale === 'es' ? 'Últimas noticias' : 'Latest News'}
              description={locale === 'es' ? 'Hasta ocho historias recientes no utilizadas, ordenadas por fecha.' : 'Up to eight unused recent stories, ordered by publication date.'}
            />

            <EditorSection title={locale === 'es' ? 'Selección editorial' : "Editors' Picks"}>
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((position) => (
                  <HomepageSlotCard
                    {...slotProps}
                    key={position}
                    slot="editors_pick"
                    label={`${locale === 'es' ? 'Selección' : 'Pick'} ${position + 1}`}
                    placement={getPlacement(grouped.editorsPick, position)}
                    position={position}
                  />
                ))}
              </div>
            </EditorSection>

            <AutomaticSection
              locale={locale}
              title={locale === 'es' ? 'Podcasts' : 'Podcasts'}
              description={locale === 'es' ? 'Bloque automático conectado al contenido de podcasts.' : 'Automatic block connected to podcast content.'}
              icon="radio"
            />

            <EditorSection title={locale === 'es' ? 'Contenido destacado' : 'Featured Content'}>
              <HomepageSlotCard
                {...slotProps}
                slot="latest_feature"
                label={locale === 'es' ? 'Historia destacada' : 'Featured Story'}
                placement={getPlacement(grouped.latestFeature)}
              />
            </EditorSection>

            <EditorSection title={locale === 'es' ? 'Ver en vivo' : 'Watch + Live'}>
              <HomepageSlotCard
                {...slotProps}
                slot="video_feature"
                label={locale === 'es' ? 'Video destacado' : 'Video Feature'}
                placement={getPlacement(grouped.videoFeature)}
              />
            </EditorSection>

            <AutomaticSection
              locale={locale}
              title={locale === 'es' ? 'Videos cortos' : 'Shorts'}
              description={locale === 'es' ? 'Módulo automático de videos cortos.' : 'Automatic short-video module.'}
            />

            <EditorSection
              title={locale === 'es' ? 'Secciones' : 'Section Features'}
              description={locale === 'es' ? 'Una historia destacada por categoría.' : 'One featured story for each editorial category.'}
            >
              <SectionFeaturesEditor
                locale={locale}
                categories={categories}
                stories={stories}
                placements={grouped.sectionFeature}
                userId={userId}
                excludedStoryIds={placedStoryIds}
                onChanged={handleChanged}
              />
            </EditorSection>

            <AutomaticSection
              locale={locale}
              title={locale === 'es' ? 'Por las islas' : 'Across the Islands'}
              description={
                locale === 'es'
                  ? `${acrossTheIslands.sanAndres.length + acrossTheIslands.oldProvidence.length + acrossTheIslands.saintCatalina.length} historias insulares disponibles; las ya utilizadas se omiten.`
                  : `${acrossTheIslands.sanAndres.length + acrossTheIslands.oldProvidence.length + acrossTheIslands.saintCatalina.length} island stories available; previously used stories are skipped.`
              }
              icon="world"
            />

            <AutomaticSection
              locale={locale}
              title={locale === 'es' ? 'Radio Simply Raizal' : 'Simply Raizal Radio'}
              description={locale === 'es' ? 'Bloque automático de radio y programación.' : 'Automatic radio and programming block.'}
              icon="radio"
            />
          </div>
        )}

        {activeTab === 'breaking' && (
          <div className="mt-6">
            <BreakingNewsEditor
              locale={locale}
              items={breakingNews}
              stories={stories}
              onChanged={handleChanged}
            />
          </div>
        )}
      </div>

      {previewOpen && (
        <FrontPagePreview
          dict={dict}
          locale={locale}
          placements={placements}
          breakingNews={breakingNews}
          latestStories={stories}
          worldStories={worldStories}
          acrossTheIslands={acrossTheIslands}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? 'bg-white text-deep shadow-sm' : 'text-muted-foreground hover:text-deep'
      }`}
    >
      {children}
    </button>
  );
}

function EditorSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-muted/30 p-4 sm:p-5">
      <div className="mb-5 border-b border-border pb-4">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-headline text-xl font-bold tracking-tight text-deep sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EditorColumn({
  title,
  emphasized = false,
  children,
}: {
  title: string;
  emphasized?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 space-y-3 rounded-xl border p-3 ${emphasized ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-white/70'}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-deep">
        {title}
      </p>
      {children}
    </div>
  );
}

function AutomaticModule({
  locale,
  title,
  description,
  icon = 'sparkles',
}: {
  locale: Locale;
  title: string;
  description: string;
  icon?: 'sparkles' | 'world' | 'radio';
}) {
  const Icon = icon === 'world' ? Globe2 : icon === 'radio' ? Radio : Sparkles;

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-deep">{title}</p>
            <span className="rounded-full bg-deep/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {locale === 'es' ? 'Automático' : 'Automatic'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function AutomaticSection({
  locale,
  title,
  description,
  icon,
}: {
  locale: Locale;
  title: string;
  description: string;
  icon?: 'world' | 'radio';
}) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-white p-5">
      <div className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-primary">
          {icon === 'world' ? (
            <Globe2 className="h-5 w-5" aria-hidden />
          ) : icon === 'radio' ? (
            <Radio className="h-5 w-5" aria-hidden />
          ) : (
            <Zap className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-headline text-lg font-bold text-deep">{title}</h2>
            <span className="rounded-full bg-live/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-deep">
              {locale === 'es' ? 'Automático' : 'Automatic'}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  );
}
