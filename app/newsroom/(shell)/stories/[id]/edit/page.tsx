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
  params: { id: string };
}

export default async function EditStoryPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  if (!user) {
    redirect('/en/auth/sign-in');
  }

  const story = await getStoryForEditing(params.id);
  if (!story) {
    notFound();
  }

  if (!canEditStory(user, story!.author?.id ?? null)) {
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
      locale={locale}
      story={story!}
      user={{
        id: user.id,
        profile: user.profile
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
