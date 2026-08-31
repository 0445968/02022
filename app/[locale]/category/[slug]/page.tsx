import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizedPath } from '@/lib/i18n/config';
import { getPublishedStoriesByCategory } from '@/lib/services/stories';
import { StoryCard } from '@/components/editorial/story-card';
import { Pagination } from '@/components/editorial/pagination';
import type { Locale } from '@/types';
import { categoryLabel } from '@/types/editorial';
import type { Metadata } from 'next';

interface PageProps {
  params: { locale: string; slug: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const result = await getPublishedStoriesByCategory(params.slug, 1, 1);
  if (!result.category) return { title: 'Not found' };
  const name = categoryLabel(result.category, locale as Locale);
  return { title: name };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);
  const page = parseInt(searchParams.page ?? '1', 10) || 1;

  const result = await getPublishedStoriesByCategory(params.slug, page, 12);

  if (!result.category) {
    return (
      <div className="container-wide py-20 text-center">
        <h1 className="font-headline text-3xl font-bold text-deep">{dict.category.categoryNotFound}</h1>
      </div>
    );
  }

  const categoryName = categoryLabel(result.category, locale);

  return (
    <div className="bg-white">
      {/* Section header */}
      <section className="border-b-2 border-deep">
        <div className="container-wide py-8">
          <h1 className="font-headline text-3xl font-bold text-deep sm:text-4xl">{categoryName}</h1>
          {result.category.descriptionEn && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {locale === 'es' ? result.category.descriptionEs : result.category.descriptionEn}
            </p>
          )}
        </div>
      </section>

      {/* Stories */}
      <section className="container-wide py-8">
        {result.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-headline text-xl font-semibold text-deep">{dict.category.noStories}</p>
            <p className="mt-1 text-sm text-muted-foreground">{dict.category.noStoriesDesc}</p>
          </div>
        ) : (
          <>
            {page === 1 && result.items[0] && (
              <div className="mb-8 border-b border-border pb-8">
                <StoryCard story={result.items[0]} locale={locale} dict={dict} variant="lead" />
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(page === 1 ? result.items.slice(1) : result.items).map((story) => (
                <StoryCard key={story.id} story={story} locale={locale} dict={dict} />
              ))}
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              dict={dict}
              basePath={localizedPath(locale, `/category/${params.slug}`)}
            />
          </>
        )}
      </section>
    </div>
  );
}
