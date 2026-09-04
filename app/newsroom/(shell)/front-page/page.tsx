import {
  getCurrentUser,
} from '@/lib/auth/session';
import {
  defaultLocale,
} from '@/lib/i18n/config';
import {
  getDictionary,
} from '@/lib/i18n/dictionaries';

import {
  getAcrossTheIslands,
} from '@/lib/services/home';

import {
  getCategories,
} from '@/lib/services/taxonomy';

import {
  getBreakingNews,
  getFrontPageStoryOptions,
  getHomepageLayoutDraft,
  getHomepageSlots,
  getPublishedStoriesByCategory,
} from '@/lib/services/front-page';

import {
  FrontPageEditor,
} from '@/components/editorial/front-page/FrontPageEditor';

export default async function FrontPagePage() {
  const user =
    await getCurrentUser();

  const locale =
    user?.profile
      ?.preferredLocale ??
    defaultLocale;

  const dict =
    getDictionary(
      locale
    );

  const [
    placements,
    layoutDraft,
    breakingNews,
    stories,
    worldStories,
    categories,
    acrossTheIslands,
  ] =
    await Promise.all([
      getHomepageSlots(),

      getHomepageLayoutDraft(),

      getBreakingNews(),

      getFrontPageStoryOptions(),

      getPublishedStoriesByCategory(
        'world',
        100
      ),

      getCategories(),

      getAcrossTheIslands(),
    ]);

  return (
    <div
      className="
        w-full
        min-w-0
      "
    >
      <FrontPageEditor
        dict={
          dict
        }
        locale={
          locale
        }
        placements={
          placements
        }
        layoutDraft={
          layoutDraft
        }
        breakingNews={
          breakingNews
        }
        stories={
          stories
        }
        worldStories={
          worldStories
        }
        categories={
          categories
        }
        acrossTheIslands={
          acrossTheIslands
        }
      />
    </div>
  );
}