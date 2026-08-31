import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { NewStoryForm } from '@/components/forms/new-story-form';

export default async function NewStoryPage() {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  if (!user) return null;

  return <NewStoryForm dict={dict} locale={locale} defaultAuthorId={user.id} />;
}
