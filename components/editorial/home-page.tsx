import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/types';

interface HomePageProps {
  dict: Dictionary;
  locale: Locale;
}

export function HomePage({ dict, locale }: HomePageProps) {
  return (
    <div className="bg-white">
      {/* Masthead band */}
      <section className="border-b border-border">
        <div className="container-wide py-8 lg:py-12">
          <div className="flex flex-col items-center text-center">
            <span className="eyebrow text-primary">{dict.home.stageLabel}</span>
            <Image
  src="/images/logo-9.png"
  alt="Simply Raizal"
  width={420}
  height={120}
  priority
  className="
    mt-3
    h-auto
    w-[260px]
    object-contain
    sm:w-[340px]
    lg:w-[420px]
  "
/>
            <p className="mt-4 max-w-2xl text-balance font-headline text-lg italic text-muted-foreground sm:text-xl">
              {dict.site.tagline}
            </p>
            <div className="mt-6 flex items-center gap-2 border border-border bg-surface-muted px-4 py-2">
              <span className="live-dot" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {dict.home.comingSoon}
              </span>
            </div>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {dict.home.comingSoonDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Placeholder editorial grid */}
      <section className="border-b border-border">
        <div className="container-wide py-8">
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {/* Lead slot */}
            <article className="bg-white p-6 md:col-span-2 md:p-8">
              <span className="eyebrow text-breaking">Breaking</span>
              <h2 className="mt-3 font-headline text-3xl font-bold leading-tight text-deep sm:text-4xl">
                {dict.home.placeholderHeadline}
              </h2>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground">
                {dict.home.placeholderSummary}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {dict.home.placeholderMeta}
              </p>
            </article>
            {/* Secondary slots */}
            <div className="grid grid-cols-1 gap-px bg-border">
              {[0, 1].map((i) => (
                <article key={i} className="bg-white p-6">
                  <span className="eyebrow text-primary">{dict.nav.latest}</span>
                  <h3 className="mt-2 font-headline text-xl font-semibold leading-snug text-deep">
                    {dict.home.placeholderHeadline}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {dict.home.placeholderSummary}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest section */}
      <section className="border-b border-border">
        <div className="container-wide py-10">
          <div className="flex items-end justify-between border-b-2 border-deep pb-3">
            <div>
              <h2 className="font-headline text-2xl font-bold text-deep sm:text-3xl">
                {dict.home.latest}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{dict.home.latestDesc}</p>
            </div>
            <Link
              href={localizedPath(locale, '/latest')}
              className="hidden items-center gap-1 text-sm font-semibold text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:underline sm:inline-flex"
            >
              {dict.home.viewAll}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <article key={i} className="bg-white p-5">
                <div className="mb-3 aspect-[4/3] w-full bg-surface-subtle" aria-hidden />
                <span className="eyebrow text-primary">{dict.nav.news}</span>
                <h3 className="mt-2 font-headline text-lg font-semibold leading-snug text-deep">
                  {dict.home.placeholderHeadline}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {dict.home.placeholderSummary}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">{dict.home.placeholderMeta}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Across the Islands */}
      <section className="border-b border-border">
        <div className="container-wide py-10">
          <div className="flex items-end justify-between border-b-2 border-deep pb-3">
            <div>
              <h2 className="font-headline text-2xl font-bold text-deep sm:text-3xl">
                {dict.home.acrossIslands}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.home.acrossIslandsDesc}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {[
              { label: dict.nav.sanAndres, key: 'san-andres' },
              { label: dict.nav.oldProvidence, key: 'old-providence' },
              { label: dict.nav.saintCatalina, key: 'saint-catalina' },
            ].map((island) => (
              <article key={island.key} className="bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-headline text-xl font-bold text-deep">{island.label}</h3>
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary/30" aria-hidden />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {dict.home.placeholderSummary}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">{dict.home.placeholderMeta}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Listen / Watch band */}
      <section className="border-b border-border bg-deep text-white">
        <div className="container-wide flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-highlight">
              <Radio className="h-4 w-4" aria-hidden />
              {dict.nav.listen}
            </span>
            <h2 className="mt-2 font-headline text-2xl font-bold sm:text-3xl">
              {dict.home.placeholderHeadline}
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/80">
              {dict.home.placeholderSummary}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            {dict.nav.listen}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
