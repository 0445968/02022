import {pollPlacementsEnabled} from '@/lib/services/poll-placements';
import {canEnterPolls} from '@/lib/services/polls';
import {reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';
import {canAccessStoryReview} from '@/lib/services/story-review';
import {canManageStoryAssignments} from '@/lib/services/story-assignments';
import {requireWorkspacePage,scopedNewsroomEnabled,newsroomLocale,mayMountFullStoryEditor} from '@/lib/services/newsroom-workspace';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { getStoryForEditing, getStoryVersions } from '@/lib/services/stories';
import { getCategories } from '@/lib/services/taxonomy';
import { getAuthors, getEditors } from '@/lib/services/staff';
import { canEditStory } from '@/lib/permissions/stories';
import { StoryEditor } from '@/components/editorial/story-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStoryPage(props: PageProps) {
  const params = await props.params;
  await requireWorkspacePage('fullEditor');
  const scoped=scopedNewsroomEnabled();
  if(scoped&&!(await mayMountFullStoryEditor(params.id)))notFound();
  const user = await getCurrentUser();
  const locale = await newsroomLocale(user);
  const dict = getDictionary(locale);

  if (!user) {
    redirect('/en/auth/sign-in');
  }

  const story = await getStoryForEditing(params.id);
  if (!story) {
    notFound();
  }

  if (!scoped&&!canEditStory(user, story!.author?.id ?? null)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-headline text-2xl font-bold text-deep">{dict.story.noPermission}</h1>
      </div>
    );
  }

  const [categories, authors, editors, versions] = await Promise.all([
    getCategories({ includeInactive: true }),
    getAuthors(),
    getEditors(),
    getStoryVersions(params.id),
  ]);

  return (
    <StoryEditor
      dict={dict}
      pollPlacementHref={pollPlacementsEnabled()&&story.status==='published'&&story.accessLevel==='public'&&await canEnterPolls()?'/newsroom/polls?kind=article&target='+params.id:undefined}
      reviewedPublication={reviewedPublicationEnabled()}
      reviewHref={(await canAccessStoryReview(params.id,story.status==='published'?'revision':'draft'))?'/newsroom/stories/'+params.id+'/review?kind='+(story.status==='published'?'revision':'draft'):undefined}
      assignmentHref={(await canManageStoryAssignments(params.id))?'/newsroom/stories/'+params.id+'/assignments':undefined}
      locale={locale}
      story={story!}
      user={{
        id: user.id,
        profile: scoped?{isAuthor:true,isEditor:true}:user.profile
          ? { isAuthor: user.profile.isAuthor, isEditor: user.profile.isEditor }
          : null,
      }}
      categories={categories}
      authors={authors}
      editors={editors}
      versions={versions}
    />
  );
}
