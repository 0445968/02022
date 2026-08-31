import type { Dictionary } from '@/lib/i18n/dictionaries';
import { localizedPath } from '@/lib/i18n/config';
import type { Locale } from '@/types';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Primary navigation for the public site.
 * Topic links now point to category routes (/[locale]/category/[slug]).
 * Island links point to island routes. "Latest" is a dedicated route.
 */
export function getPrimaryNav(dict: Dictionary, locale: Locale): NavItem[] {
  return [
    { key: 'latest', label: dict.nav.latest, href: localizedPath(locale, '/latest') },
    { key: 'news', label: dict.nav.news, href: localizedPath(locale, '/category/news') },
    { key: 'sanAndres', label: dict.nav.sanAndres, href: localizedPath(locale, '/san-andres') },
    { key: 'oldProvidence', label: dict.nav.oldProvidence, href: localizedPath(locale, '/old-providence') },
    { key: 'saintCatalina', label: dict.nav.saintCatalina, href: localizedPath(locale, '/saint-catalina') },
    { key: 'raizal', label: dict.nav.raizal, href: localizedPath(locale, '/category/raizal') },
    { key: 'environment', label: dict.nav.environment, href: localizedPath(locale, '/category/environment') },
    { key: 'politics', label: dict.nav.politics, href: localizedPath(locale, '/category/politics') },
    { key: 'business', label: dict.nav.business, href: localizedPath(locale, '/category/business') },
    { key: 'sports', label: dict.nav.sports, href: localizedPath(locale, '/category/sports') },
    { key: 'health', label: dict.nav.health, href: localizedPath(locale, '/category/health') },
    { key: 'culture', label: dict.nav.culture, href: localizedPath(locale, '/category/culture') },
    { key: 'religion', label: dict.nav.religion, href: localizedPath(locale, '/category/religion') },
    { key: 'music', label: dict.nav.music, href: localizedPath(locale, '/category/music') },
    { key: 'watch', label: dict.nav.watch, href: localizedPath(locale, '/watch') },
    { key: 'listen', label: dict.nav.listen, href: localizedPath(locale, '/listen') },
    { key: 'vault', label: dict.nav.vault, href: localizedPath(locale, '/vault') },
  ];
}

/** The shortened mobile menu: islands + key topics, with "More" expanding. */
export function getMobileNav(dict: Dictionary, locale: Locale): NavItem[] {
  return getPrimaryNav(dict, locale);
}
