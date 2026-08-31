import { createClient } from '@/lib/db/supabase-server';
import { redirect } from 'next/navigation';
import { localizedPath } from '@/lib/i18n/config';
import type { Locale } from '@/types';

/**
 * If the user is already signed in, redirect away from auth pages
 * to the locale homepage. This is a server-side guard.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(localizedPath(locale, '/'));
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
