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
  getPublicBreakingNews,
  getPublicHomepageSlots,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function Page({
  params,
}: PageProps) {
  const locale =
    params.locale as Locale;

  const dict =
    getDictionary(locale);

  const [
    placements,
    breakingNews,
    latestStories,
    acrossTheIslands,
  ] = await Promise.all([
    getPublicHomepageSlots(),

    getPublicBreakingNews(),

    getFrontPageStoryOptions(
      undefined,
      20
    ),

    getAcrossTheIslands(),
  ]);

  return (
    <HomePage
      dict={dict}
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
      acrossTheIslands={
        acrossTheIslands
      }
    />
  );
}