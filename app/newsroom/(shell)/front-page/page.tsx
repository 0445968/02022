import { getCurrentUser } from '@/lib/auth/session';
import { defaultLocale } from '@/lib/i18n/config';

import { getCategories } from '@/lib/services/taxonomy';

import {
  getBreakingNews,
  getFrontPageStoryOptions,
  getHomepageSlots,
} from '@/lib/services/front-page';

import { FrontPageEditor } from '@/components/editorial/front-page/FrontPageEditor';

export default async function FrontPagePage() {
  const user = await getCurrentUser();

  const locale =
    user?.profile?.preferredLocale ??
    defaultLocale;

  const [
    placements,
    breakingNews,
    stories,
    categories,
  ] = await Promise.all([
    getHomepageSlots(),
    getBreakingNews(),
    getFrontPageStoryOptions(),
    getCategories(),
  ]);

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-6
        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          border-b
          border-border
          pb-5
        "
      >
        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Portada'
            : 'Front Page'}
        </p>

        <h1
          className="
            mt-2
            font-headline
            text-3xl
            font-bold
            tracking-tight
            text-deep
          "
        >
          {locale === 'es'
            ? 'Editar portada'
            : 'Edit Front Page'}
        </h1>

        <p
          className="
            mt-2
            max-w-2xl
            text-sm
            leading-6
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Elige qué historias aparecen en las posiciones principales de Simply Raizal y administra las alertas de última hora.'
            : 'Choose which stories appear in Simply Raizal’s main homepage positions and manage breaking-news alerts.'}
        </p>
      </div>

      <FrontPageEditor
        locale={locale}
        userId={
          user?.id ?? null
        }
        placements={
          placements
        }
        breakingNews={
          breakingNews
        }
        stories={stories}
        categories={
          categories
        }
      />
    </div>
  );
}