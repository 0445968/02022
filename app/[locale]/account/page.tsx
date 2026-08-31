import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localizedPath } from '@/lib/i18n/config';
import type { Locale } from '@/types';
import { AccountSettings } from '@/components/forms/account-settings';

interface PageProps {
  params: { locale: string };
}

export default async function AccountPage({ params }: PageProps) {
  const locale = params.locale as Locale;
  const user = await getCurrentUser();

  if (!user) {
    redirect(localizedPath(locale, '/auth/sign-in'));
  }

  const dict = getDictionary(locale);

  return <AccountSettings dict={dict} locale={locale} user={user} />;
}
