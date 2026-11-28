import type { PublicListResult } from '@/types/editorial';
import { StoryCard } from '@/components/editorial/story-card';
import { Pagination } from '@/components/editorial/pagination';
import type { Locale } from '@/types';

export function IslandPageContent({
  islandName,
  result,
  locale,
  dict,
  basePath,
  emptyTitle,
  emptyDesc,
}: {
  islandName: string;
  result: PublicListResult;
  locale: Locale;
  dict: import('@/lib/i18n/dictionaries').Dictionary;
  basePath: string;
  emptyTitle: string;
  emptyDesc: string;
}) {
  return (
    <div className="bg-white">
      <section className="border-b-2 border-deep">
        <div className="container-wide py-8">
          <h1 className="font-headline text-3xl font-bold text-deep sm:text-4xl">{islandName}</h1>
        </div>
      </section>

      <section className="container-wide py-8">
        {result.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-headline text-xl font-semibold text-deep">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDesc}</p>
          </div>
        ) : (
          <>
            {result.page === 1 && result.items[0] && (
              <div className="mb-8 border-b border-border pb-8">
                <StoryCard story={result.items[0]} locale={locale} dict={dict} variant="lead" />
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(result.page === 1 ? result.items.slice(1) : result.items).map((story) => (
                <StoryCard key={story.id} story={story} locale={locale} dict={dict} />
              ))}
            </div>
            <Pagination page={result.page} totalPages={result.totalPages} dict={dict} basePath={basePath} />
          </>
        )}
      </section>
    </div>
  );
}
