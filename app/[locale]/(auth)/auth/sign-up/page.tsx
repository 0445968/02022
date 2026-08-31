import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SignUpForm } from '@/components/forms/sign-up-form';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localizedPath } from '@/lib/i18n/config';
import type { Locale } from '@/types';

interface PageProps {
  params: { locale: string };
}

export default async function SignUpPage({ params }: PageProps) {
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-headline text-3xl font-bold text-deep">{dict.auth.signUpTitle}</h1>
        <p className="text-sm text-muted-foreground">{dict.auth.signUpDesc}</p>
      </div>

      <div className="border border-border bg-white p-6 sm:p-8">
        <SignUpForm dict={dict} locale={locale} />
      </div>

      <div className="text-center">
        <Link
          href={localizedPath(locale, '/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {dict.auth.backHome}
        </Link>
      </div>
    </div>
  );
}
