import Link from 'next/link';

import {
  ArrowRight,
  Play,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

interface ShortsBlockProps {
  locale: Locale;
}

const placeholderShorts = [
  {
    id: 'short-1',
    title: 'Island life in sixty seconds',
  },
  {
    id: 'short-2',
    title: 'A quick look across the Archipelago',
  },
  {
    id: 'short-3',
    title: 'Voices from the community',
  },
  {
    id: 'short-4',
    title: 'Today across the islands',
  },
  {
    id: 'short-5',
    title: 'Scenes from West Island Times',
  },
];

export function ShortsBlock({
  locale,
}: ShortsBlockProps) {
  return (
    <section
      className="
        border-b
        border-border
        bg-white
      "
    >
      <div
        className="
          container-wide
          py-7
          lg:py-8
        "
      >
        {/* Header */}
        <div
          className="
            flex
            items-end
            justify-between
            gap-4
            border-b-2
            border-black
            pb-2
          "
        >
          <div>
            <h2
              className="
                font-headline
                text-2xl
                font-bold
                tracking-[-0.025em]
                text-black
                sm:text-3xl
              "
            >
              Shorts
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Videos rápidos desde todo el Archipiélago.'
                : 'Quick video stories from across the Archipelago.'}
            </p>
          </div>

          <Link
            href={localizedPath(
              locale,
              '/shorts'
            )}
            className="
              inline-flex
              shrink-0
              items-center
              gap-1
              text-[10px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-muted-foreground
              transition-colors
              hover:text-black
            "
          >
            {locale === 'es'
              ? 'Ver todos'
              : 'View all'}

            <ArrowRight
              className="h-3.5 w-3.5"
              aria-hidden
            />
          </Link>
        </div>

        {/* Horizontal rail */}
        <div
          className="
            mt-5
            flex
            gap-4
            overflow-x-auto
            pb-3
          "
        >
          {placeholderShorts.map(
            (short) => (
              <article
                key={short.id}
                className="
                  group
                  w-[170px]
                  shrink-0
                  sm:w-[190px]
                  lg:w-[210px]
                "
              >
                <Link
                  href={localizedPath(
                    locale,
                    '/shorts'
                  )}
                  className="
                    block
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-primary
                  "
                >
                  <div
                    className="
                      relative
                      aspect-[9/16]
                      overflow-hidden
                      rounded-md
                      bg-neutral-200
                    "
                  >
                    {/* Temporary visual until Stage 8 */}
                    <div
                      className="
                        absolute
                        inset-0
                        bg-gradient-to-b
                        from-neutral-200
                        via-neutral-300
                        to-neutral-500
                      "
                    />

                    <div
                      className="
                        absolute
                        left-3
                        top-3
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-md
                        bg-black/75
                        px-2
                        py-1
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.1em]
                        text-white
                      "
                    >
                      <Play
                        className="
                          h-3
                          w-3
                          fill-current
                        "
                        aria-hidden
                      />

                      Short
                    </div>

                    <div
                      className="
                        absolute
                        inset-x-0
                        bottom-0
                        bg-gradient-to-t
                        from-black/85
                        via-black/35
                        to-transparent
                        p-3
                        pt-12
                      "
                    >
                      <h3
                        className="
                          font-headline
                          text-base
                          font-bold
                          leading-[1.12]
                          text-white
                        "
                      >
                        {short.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              </article>
            )
          )}
        </div>

        <p
          className="
            mt-2
            text-xs
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Los videos reales se conectarán cuando construyamos el sistema de Shorts.'
            : 'Real video content will connect when the Shorts system is built.'}
        </p>
      </div>
    </section>
  );
}