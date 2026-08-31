import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizedPath } from '@/lib/i18n/config';
import { getLatestStories } from '@/lib/services/stories';
import { StoryCard } from '@/components/editorial/story-card';
import { Pagination } from '@/components/editorial/pagination';
import type { Locale } from '@/types';
import type { Metadata } from 'next';

interface PageProps {
  params: { locale: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const dict = getDictionary(locale as Locale);
  return { title: dict.latest.title };
}

export default async function LatestPage({ params, searchParams }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);
  const page = parseInt(searchParams.page ?? '1', 10) || 1;

  const result = await getLatestStories(page, 12);

  return (
    <div className="bg-white">
      <section className="border-b-2 border-deep">
        <div className="container-wide py-8">
          <h1 className="font-headline text-3xl font-bold text-deep sm:text-4xl">{dict.latest.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{dict.latest.desc}</p>
        </div>
      </section>

      <section className="container-wide py-8">
        {result.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-headline text-xl font-semibold text-deep">{dict.latest.noStories}</p>
            <p className="mt-1 text-sm text-muted-foreground">{dict.latest.noStoriesDesc}</p>
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
              basePath={localizedPath(locale, '/latest')}
            />
          </>
        )}
      </section>
    </div>
  );
}
