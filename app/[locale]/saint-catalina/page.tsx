import {PlacedPolls} from '@/components/polls/PlacedPolls';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizedPath } from '@/lib/i18n/config';
import { getPublishedStoriesByIsland } from '@/lib/services/stories';
import { IslandPageContent } from '@/components/editorial/island-page-content';
import type { Locale } from '@/types';
import type { IslandScope } from '@/lib/db/database.types';
import { islandLabel } from '@/types/editorial';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

const ISLAND: IslandScope = 'saint_catalina';

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = isLocale(params.locale) ? params.locale : 'en';
  return { title: islandLabel(ISLAND, locale as Locale) };
}

export default async function SaintCatalinaPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);
  const page = parseInt(searchParams.page ?? '1', 10) || 1;

  const result = await getPublishedStoriesByIsland(ISLAND, page, 12);
  const islandName = islandLabel(ISLAND, locale);

  return (
    <>
    <IslandPageContent
      islandName={islandName}
      result={result}
      locale={locale}
      dict={dict}
      basePath={localizedPath(locale, '/saint-catalina')}
      emptyTitle={dict.island.noStories}
      emptyDesc={dict.island.noStoriesDesc}
    />
    {page===1&&<PlacedPolls locale={locale} kind="saint-catalina" returnPath={localizedPath(locale,'/saint-catalina')}/>}
    </>
  );
}
