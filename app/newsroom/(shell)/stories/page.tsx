import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { listStories } from '@/lib/services/stories';
import { getCategories } from '@/lib/services/taxonomy';
import { getAuthors } from '@/lib/services/staff';
import { StoriesDashboard } from '@/components/editorial/stories-dashboard';
import type { StoryStatus, StoryLanguage, IslandScope } from '@/lib/db/database.types';

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    language?: string;
    author?: string;
    category?: string;
    island?: string;
    sort?: string;
  };
}

const VALID_STATUSES: StoryStatus[] = ['draft', 'in_review', 'scheduled', 'published', 'archived'];
const VALID_LANGUAGES: StoryLanguage[] = ['en', 'es'];
const VALID_ISLANDS: IslandScope[] = ['san_andres', 'old_providence', 'saint_catalina', 'archipelago', 'none'];

export default async function StoriesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  const page = parseInt(searchParams.page ?? '1', 10) || 1;
  const sortBy = (searchParams.sort ?? 'updated_desc') as
    | 'updated_desc' | 'updated_asc' | 'published_desc' | 'headline_asc';

  const status = VALID_STATUSES.includes(searchParams.status as StoryStatus)
    ? (searchParams.status as StoryStatus)
    : 'all';
  const language = VALID_LANGUAGES.includes(searchParams.language as StoryLanguage)
    ? (searchParams.language as StoryLanguage)
    : 'all';
  const island = VALID_ISLANDS.includes(searchParams.island as IslandScope)
    ? (searchParams.island as IslandScope)
    : 'all';

  const [storiesResult, categories, authors] = await Promise.all([
    listStories({
      page,
      perPage: 20,
      search: searchParams.search,
      status,
      language,
      authorId: searchParams.author ?? 'all',
      categoryId: searchParams.category ?? 'all',
      island,
      sortBy,
    }),
    getCategories({ includeInactive: true }),
    getAuthors(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-headline text-2xl font-bold text-deep">{dict.stories.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {storiesResult.total} {dict.common.results}
          </p>
        </div>
        <Link
          href="/newsroom/stories/new"
          className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {dict.stories.newStory}
        </Link>
      </div>

      <StoriesDashboard
        dict={dict}
        stories={storiesResult.items}
        page={storiesResult.page}
        totalPages={storiesResult.totalPages}
        total={storiesResult.total}
        categories={categories}
        authors={authors}
        currentFilters={{
          search: searchParams.search ?? '',
          status,
          language,
          authorId: searchParams.author ?? 'all',
          categoryId: searchParams.category ?? 'all',
          island,
          sortBy,
        }}
      />
    </div>
  );
}
