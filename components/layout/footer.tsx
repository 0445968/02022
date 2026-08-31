import Link from 'next/link';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/types';

interface FooterProps {
  dict: Dictionary;
  locale: Locale;
}

export function Footer({ dict, locale }: FooterProps) {
  const sections = [
    { label: dict.nav.sanAndres, href: localizedPath(locale, '/san-andres') },
    { label: dict.nav.oldProvidence, href: localizedPath(locale, '/old-providence') },
    { label: dict.nav.saintCatalina, href: localizedPath(locale, '/saint-catalina') },
    { label: dict.nav.raizal, href: localizedPath(locale, '/raizal') },
  ];

  const topics = [
    dict.nav.environment, dict.nav.politics, dict.nav.business, dict.nav.sports,
    dict.nav.health, dict.nav.culture, dict.nav.religion, dict.nav.music,
  ];

  const editorial = [
    dict.footer.masthead, dict.footer.ethics, dict.footer.newsletter, dict.footer.advertising,
  ];

  return (
    <footer className="mt-auto border-t-4 border-deep bg-white">
      <div className="container-wide py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <p className="font-headline text-2xl font-bold text-deep">
              Simply<span className="text-primary">Raizal</span>
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {dict.footer.aboutDesc}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
              {dict.footer.raizalVoice}
            </p>
          </div>

          {/* Sections */}
          <div>
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-deep">
              {dict.footer.sections}
            </h2>
            <ul className="mt-3 space-y-2">
              {sections.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-sm text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Topics */}
          <div>
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-deep">
              {dict.nav.news}
            </h2>
            <ul className="mt-3 space-y-2">
              {topics.map((t) => (
                <li key={t}>
                  <span className="text-sm text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Editorial */}
          <div>
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-deep">
              {dict.footer.editorial}
            </h2>
            <ul className="mt-3 space-y-2">
              {editorial.map((t) => (
                <li key={t}>
                  <span className="text-sm text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / legal */}
          <div>
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-deep">
              {dict.footer.contact}
            </h2>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-muted-foreground">{dict.footer.privacy}</span></li>
              <li><span className="text-sm text-muted-foreground">{dict.footer.terms}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Simply Raizal. {dict.footer.rights}
          </p>
          <p className="text-xs text-muted-foreground">
            San Andrés · Old Providence · Saint Catalina
          </p>
        </div>
      </div>
    </footer>
  );
}
