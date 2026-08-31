import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizedPath } from '@/lib/i18n/config';
import { getPublishedStoriesByIsland } from '@/lib/services/stories';
import { StoryCard } from '@/components/editorial/story-card';
import { Pagination } from '@/components/editorial/pagination';
import { IslandPageContent } from '@/app/[locale]/san-andres/page';
import type { Locale } from '@/types';
import type { IslandScope } from '@/lib/db/database.types';
import { islandLabel } from '@/types/editorial';
import type { Metadata } from 'next';

interface PageProps {
  params: { locale: string };
  searchParams: { page?: string };
}

const ISLAND: IslandScope = 'old_providence';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  return { title: islandLabel(ISLAND, locale as Locale) };
}

export default async function OldProvidencePage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);
  const page = parseInt(searchParams.page ?? '1', 10) || 1;

  const result = await getPublishedStoriesByIsland(ISLAND, page, 12);
  const islandName = islandLabel(ISLAND, locale);

  return (
    <IslandPageContent
      islandName={islandName}
      result={result}
      locale={locale}
      dict={dict}
      basePath={localizedPath(locale, '/old-providence')}
      emptyTitle={dict.island.noStories}
      emptyDesc={dict.island.noStoriesDesc}
    />
  );
}
