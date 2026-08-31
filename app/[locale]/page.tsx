import { HomePage } from '@/components/editorial/home-page';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/types';

interface PageProps {
  params: { locale: string };
}

export default async function Page({ params }: PageProps) {
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  return <HomePage dict={dict} locale={locale} />;
}
