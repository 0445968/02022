import {redirect} from 'next/navigation';
import {canStartWriterDraft} from '@/lib/services/writer-drafts';
import {getWorkspaceAccess,scopedNewsroomEnabled,requireWorkspacePage,newsroomLocale} from '@/lib/services/newsroom-workspace';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { NewStoryForm } from '@/components/forms/new-story-form';

export default async function NewStoryPage() {
  if(scopedNewsroomEnabled()&&!(await getWorkspaceAccess()).createStory&&await canStartWriterDraft())redirect('/newsroom/contributor/new');
  await requireWorkspacePage('createStory');
  const user = await getCurrentUser();
  const locale = await newsroomLocale(user);
  const dict = getDictionary(locale);

  if (!user) return null;

  return <NewStoryForm dict={dict} locale={locale} defaultAuthorId={user.id} />;
}
