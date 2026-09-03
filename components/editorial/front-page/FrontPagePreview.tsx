'use client';

import { ArrowLeft, ExternalLink, X } from 'lucide-react';

import { HomePage } from '@/components/editorial/home-page';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';
import type { HomeStory } from '@/lib/services/home';
import type { Locale } from '@/types';

interface FrontPagePreviewProps {
  dict: Dictionary;
  locale: Locale;
  placements: HomepagePlacement[];
  breakingNews: BreakingNewsItem[];
  latestStories: FrontPageStoryOption[];
  worldStories: FrontPageStoryOption[];
  acrossTheIslands: {
    sanAndres: HomeStory[];
    oldProvidence: HomeStory[];
    saintCatalina: HomeStory[];
  };
  onClose: () => void;
}

export function FrontPagePreview({
  dict,
  locale,
  placements,
  breakingNews,
  latestStories,
  worldStories,
  acrossTheIslands,
  onClose,
}: FrontPagePreviewProps) {
  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={
        locale === 'es'
          ? 'Vista previa de la portada'
          : 'Front-page preview'
      }
    >
      <div className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-deep transition-colors hover:bg-surface-muted"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {locale === 'es' ? 'Volver al editor' : 'Back to editor'}
          </button>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {locale === 'es' ? 'Vista previa en vivo' : 'Live preview'}
            </p>
            <p className="text-sm font-semibold text-deep">Simply Raizal</p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/${locale}`}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-deep transition-colors hover:bg-surface-muted sm:inline-flex"
            >
              {locale === 'es' ? 'Abrir sitio' : 'Open site'}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-deep transition-colors hover:bg-surface-muted"
              aria-label={locale === 'es' ? 'Cerrar vista previa' : 'Close preview'}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        <HomePage
          dict={dict}
          locale={locale}
          placements={placements}
          breakingNews={breakingNews}
          latestStories={latestStories}
          worldStories={worldStories}
          acrossTheIslands={acrossTheIslands}
        />
      </div>
    </div>
  );
}
