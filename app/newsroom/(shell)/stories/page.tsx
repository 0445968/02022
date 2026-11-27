import Link from 'next/link';
import {canEnterEditorialCalendar,readStoryPublicationQueue} from '@/lib/services/editorial-calendar';
import type {StoryQueueDisplay} from '@/lib/permissions/story-publication-queue';
import {getWorkspaceAccess,requireWorkspacePage,scopedNewsroomEnabled,newsroomLocale} from '@/lib/services/newsroom-workspace';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { listStories } from '@/lib/services/stories';
import { getCategories } from '@/lib/services/taxonomy';
import { getAuthors } from '@/lib/services/staff';
import { StoriesDashboard } from '@/components/editorial/stories-dashboard';
import type { StoryStatus, StoryLanguage, IslandScope, AccessLevel } from '@/lib/db/database.types';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    language?: string;
    author?: string;
    category?: string;
    island?: string;
    sort?: string;
    access?: string;
  }>;
}

const VALID_STATUSES: StoryStatus[] = ['draft', 'in_review', 'scheduled', 'published', 'archived'];
const VALID_LANGUAGES: StoryLanguage[] = ['en', 'es'];
const VALID_ISLANDS: IslandScope[] = ['san_andres', 'old_providence', 'saint_catalina', 'archipelago', 'none'];

export default async function StoriesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  await requireWorkspacePage('viewStories');
  const access=scopedNewsroomEnabled()?await getWorkspaceAccess():null;
  const user = await getCurrentUser();
  const locale = await newsroomLocale(user);
  const dict = getDictionary(locale);

  const page = Math.min(10000,Math.max(1,parseInt(searchParams.page ?? '1',10)||1));
  const sorts=['updated_desc','updated_asc','published_desc','headline_asc'] as const;
  const sortBy=sorts.find(sort=>sort===searchParams.sort)??'updated_desc';

  const status = VALID_STATUSES.includes(searchParams.status as StoryStatus)
    ? (searchParams.status as StoryStatus)
    : 'all';
  const language = VALID_LANGUAGES.includes(searchParams.language as StoryLanguage)
    ? (searchParams.language as StoryLanguage)
    : 'all';
  const island = VALID_ISLANDS.includes(searchParams.island as IslandScope)
    ? (searchParams.island as IslandScope)
    : 'all';

  const accessLevel=(['public','registered','subscriber','premium'] as const).find(v=>v===searchParams.access)??'all';
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
      accessLevel,
    }),
    getCategories({ includeInactive: true }),
    getAuthors(),
  ]);

  let publicationQueue:StoryQueueDisplay=null;
  if(await canEnterEditorialCalendar()){
    try{publicationQueue=storiesResult.items.length?await readStoryPublicationQueue(storiesResult.items.map(s=>s.id)):{asOf:new Date().toISOString(),items:[]};}
    catch{publicationQueue='unavailable';}
  }

  return (
    <div className="w-full min-w-0 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="font-headline text-2xl font-bold text-deep">{dict.stories.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {storiesResult.total} {dict.common.results}
          </p>
        </div>
        {(!access||access.createStory)&&<Link
          href="/newsroom/stories/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {dict.stories.newStory}
        </Link>}
      </div>

      <StoriesDashboard
        dict={dict}
        locale={locale}
        preferenceKey={user?.id??'local'}
        asOf={new Date().toISOString()}
        publicationQueue={publicationQueue}
        canEdit={!access||access.fullEditor}
        canCreate={!access||access.createStory}
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
          accessLevel:accessLevel as AccessLevel|'all',
        }}
      />
    </div>
  );
}
