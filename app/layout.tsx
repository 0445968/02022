import type { Metadata } from 'next';

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
    default: 'West Island Times | News from the Archipelago',
    template: '%s — West Island Times',
  },

  description:
    'An independent digital media platform serving the Raizal people and the Archipelago of San Andrés, Old Providence and Saint Catalina.',

  metadataBase: new URL('https://westislandtimes.com'),

  openGraph: {
    title: 'West Island Times',
    description:
      'News from the Archipelago of San Andrés, Old Providence and Saint Catalina.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
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