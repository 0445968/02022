import type {
  Metadata,
} from 'next';

import {
  Figtree,
  Inter,
  Source_Serif_4,
} from 'next/font/google';

import './globals.css';

const headlineFont =
  Figtree({
    subsets: ['latin'],
    variable:
      '--font-headline',
    display: 'swap',
    style: [
      'normal',
      'italic',
    ],
  });

const subheadlineFont =
  Source_Serif_4({
    subsets: ['latin'],
    variable:
      '--font-subheadline',
    display: 'swap',
    style: [
      'normal',
      'italic',
    ],
  });

const inter =
  Inter({
    subsets: ['latin'],
    variable:
      '--font-interface',
    display: 'swap',
  });

export const metadata:
  Metadata = {
  title: {
    default:
      'Simply Raizal — News from the Archipelago',
    template:
      '%s — Simply Raizal',
  },

  description:
    'An independent digital media platform serving the Raizal people and the Archipelago of San Andrés, Old Providence and Saint Catalina.',

  metadataBase:
    new URL(
      'https://simplyraizal.com'
    ),

  openGraph: {
    title:
      'Simply Raizal',

    description:
      'News from the Archipelago of San Andrés, Old Providence and Saint Catalina.',

    type:
      'website',
  },
};

export default function RootLayout({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
  className={`${headlineFont.variable} ${subheadlineFont.variable} ${inter.variable} font-interface antialiased`}
>
        {children}
      </body>
    </html>
  );
}