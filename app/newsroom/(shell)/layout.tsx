import { redirect } from 'next/navigation';
import { getCurrentUser, RequireAuthError, RequireRoleError } from '@/lib/auth/session';
import { canAccessNewsroom } from '@/lib/permissions';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { NewsroomShell } from '@/components/editorial/newsroom-shell';

/**
 * Newsroom layout — NOT locale-prefixed (it is an internal tool).
 * The interface language follows the user's preferred_locale from their
 * profile, defaulting to the site default locale.
 * Access is restricted server-side: only authors and editors may enter.
 */
export default async function NewsroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect('/en/auth/sign-in');
  }

  if (!user) {
    redirect('/en/auth/sign-in');
  }

  if (!canAccessNewsroom(user)) {
    // Signed in but lacks staff role — send to access-denied page.
    redirect('/newsroom/denied');
  }

  const locale = user.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  return (
    <NewsroomShell
  dict={dict}
  locale={locale}
  user={user}
>
  {children}
</NewsroomShell>
  );
}
