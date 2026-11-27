import {PlacedPolls} from '@/components/polls/PlacedPolls';
import {readPublicHomepageVisibility} from '@/lib/services/public-homepage-visibility';
import {
  HomePage,
} from '@/components/editorial/home-page';

import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
  getAcrossTheIslands,
} from '@/lib/services/home';

import {
  getFrontPageStoryOptions,
  getPublishedStoriesByCategory,
  getPublicBreakingNews,
  getPublicHomepageSlots,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const locale =
    params.locale as Locale;

  const dict =
    getDictionary(locale);

  const [
    placements,
    breakingNews,
    latestStories,
    worldStories,
    acrossTheIslands,
    visibility,
  ] = await Promise.all([
    getPublicHomepageSlots(locale),

    getPublicBreakingNews(),

    getFrontPageStoryOptions(
      undefined,
      60
    ),

    getPublishedStoriesByCategory(
      'world',
      12
    ),

    getAcrossTheIslands(),
    readPublicHomepageVisibility(),
  ]);

  return (
    <>
    <HomePage
      dict={dict}
      visibility={visibility}
      locale={locale}
      placements={
        placements
      }
      breakingNews={
        breakingNews
      }
      latestStories={
        latestStories
      }
      worldStories={
        worldStories
      }
      acrossTheIslands={
        acrossTheIslands
      }
    />
    <PlacedPolls locale={locale} kind="homepage" returnPath={'/'+locale}/>
    </>
  );
}
