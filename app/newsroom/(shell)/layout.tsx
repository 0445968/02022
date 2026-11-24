import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { mayEnterNewsroom } from '@/lib/permissions/staff-route-gates';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import {getWorkspaceAccess,scopedNewsroomEnabled,readWorkspaceOnboarding} from '@/lib/services/newsroom-workspace';
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
    redirect('/en/auth/sign-in?next=%2Fnewsroom');
  }

  if (!user) {
    redirect('/en/auth/sign-in?next=%2Fnewsroom');
  }

  const scoped=scopedNewsroomEnabled()?await getWorkspaceAccess():null;
  if(scoped?!scoped.allowed:!(await mayEnterNewsroom(user))) {
    // Signed in but lacks staff role — send to access-denied page.
    redirect('/newsroom/denied');
  }

  let locale = user.profile?.preferredLocale ?? defaultLocale;
  const onboarding=scoped?await readWorkspaceOnboarding():null;
  locale=onboarding?.profile?.locale??locale;
  const dict = getDictionary(locale);
  const showTeamNav = scoped?.viewTeam??false;

  return (
    <NewsroomShell
  dict={dict}
  locale={locale}
  user={user}
  showTeamNav={showTeamNav} scopedNav={scoped?.nav}
  staffName={onboarding?.profile?.displayName} staffRoles={onboarding?.roles.map(r=>locale==='es'?r.nameEs:r.nameEn).join(' · ')}
>
  {children}
</NewsroomShell>
  );
}
