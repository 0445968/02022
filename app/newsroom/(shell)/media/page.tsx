import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { MediaLibrary } from '@/components/editorial/media-library';

export default async function MediaPage() {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  if (!user) return null;

  return <MediaLibrary dict={dict} userId={user.id} />;
}
