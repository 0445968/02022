import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';

export default async function NewsroomDenied() {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md border border-border bg-white p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-breaking" aria-hidden />
        <h1 className="mt-4 font-headline text-2xl font-bold text-deep">
          {dict.newsroom.noAccess}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.newsroom.noAccessDesc}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {dict.newsroom.goHome}
        </Link>
      </div>
    </div>
  );
}
