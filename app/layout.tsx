import {BRAND_NAME,BRAND_ICON} from '@/lib/brand';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_HEADER } from '@/lib/i18n/config';

import {
  Figtree,
  IBM_Plex_Sans,
  Inter,
  Source_Serif_4,
} from 'next/font/google';

import './globals.css';

const headlineFont = Figtree({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
  style: ['normal', 'italic'],
});

const subheadlineFont = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-subheadline',
  display: 'swap',
  style: ['normal', 'italic'],
});

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const interfaceFont = Inter({
  subsets: ['latin'],
  variable: '--font-interface',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME+' | News from the Archipelago',
    template: '%s — '+BRAND_NAME,
  },

  description:
    'An independent digital media platform serving the Raizal people and the Archipelago of San Andrés, Old Providence and Saint Catalina.',

  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')?process.env.NEXT_PUBLIC_SITE_URL:'https://clear-talks.vercel.app'),
  icons: {icon:{url:BRAND_ICON,type:'image/svg+xml'}},

  openGraph: {
    title: BRAND_NAME,
    description:
      'News from the Archipelago of San Andrés, Old Providence and Saint Catalina.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestLocale=(await headers()).get(LOCALE_HEADER);
  const locale=isLocale(requestLocale)?requestLocale:defaultLocale;
  return (
    <html
      lang={locale}
      suppressHydrationWarning
    >
      <body
        className={`${headlineFont.variable} ${subheadlineFont.variable} ${bodyFont.variable} ${interfaceFont.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}