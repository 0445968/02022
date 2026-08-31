import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, locales } from '@/lib/i18n/config';
import { I18nProvider } from '@/lib/i18n/context';
import { PublicShell } from '@/components/layout/public-shell';
import type { Locale } from '@/types';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export async function generateMetadata({ params }: LayoutProps) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const dict = getDictionary(locale as Locale);
  return {
    title: {
      default: `${dict.site.name} — ${dict.site.tagline}`,
      template: `%s — ${dict.site.name}`,
    },
    description: dict.site.description,
    alternates: {
      languages: {
        en: '/en',
        es: '/es',
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const locale = params.locale as Locale;
  const dict = getDictionary(locale);
  const user = await getCurrentUser();

  return (
    <I18nProvider locale={locale} dict={dict}>
      <PublicShell dict={dict} locale={locale} user={user}>
        {children}
      </PublicShell>
    </I18nProvider>
  );
}
