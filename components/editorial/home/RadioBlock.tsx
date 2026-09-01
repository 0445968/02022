import Link from 'next/link';

import {
  ArrowRight,
  Play,
  Radio,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

interface RadioBlockProps {
  locale: Locale;
}

export function RadioBlock({
  locale,
}: RadioBlockProps) {
  return (
    <section
      className="
        border-b
        border-border
        bg-black
        text-white
      "
    >
      <div
        className="
          container-wide
          grid
          gap-8
          py-8
          lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]
          lg:items-center
        "
      >
        <div>
          <div
            className="
              inline-flex
              items-center
              gap-2
              text-[10px]
              font-black
              uppercase
              tracking-[0.12em]
              text-white/60
            "
          >
            <Radio
              className="h-4 w-4"
              aria-hidden
            />

            West Island Times Radio
          </div>

          <h2
            className="
              mt-3
              max-w-2xl
              font-headline
              text-3xl
              font-bold
              leading-[1.05]
              tracking-[-0.025em]
              text-white
              sm:text-4xl
            "
          >
            {locale === 'es'
              ? 'Las voces del Archipiélago, en vivo.'
              : 'The voices of the Archipelago, live.'}
          </h2>

          <p
            className="
              mt-3
              max-w-xl
              text-sm
              leading-6
              text-white/65
              sm:text-base
            "
          >
            {locale === 'es'
              ? 'Noticias, conversación, cultura y música desde San Andrés, Old Providence y Saint Catalina.'
              : 'News, conversation, culture and music from San Andrés, Old Providence and Saint Catalina.'}
          </p>

          <div
            className="
              mt-5
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <Link
              href={localizedPath(
                locale,
                '/radio'
              )}
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-md
                bg-white
                px-4
                text-xs
                font-black
                uppercase
                tracking-[0.08em]
                text-black
                transition-opacity
                hover:opacity-85
              "
            >
              <Play
                className="
                  h-4
                  w-4
                  fill-current
                "
                aria-hidden
              />

              {locale === 'es'
                ? 'Escuchar en vivo'
                : 'Listen live'}
            </Link>

            <Link
              href={localizedPath(
                locale,
                '/listen'
              )}
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-md
                border
                border-white/20
                px-4
                text-xs
                font-bold
                uppercase
                tracking-[0.08em]
                text-white
                transition-colors
                hover:border-white/50
              "
            >
              {locale === 'es'
                ? 'Todo el audio'
                : 'All audio'}

              <ArrowRight
                className="h-4 w-4"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        <div
          className="
            border-t
            border-white/15
            pt-5
            lg:border-l
            lg:border-t-0
            lg:pl-8
            lg:pt-0
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-breaking
              "
              aria-hidden
            />

            <span
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.12em]
                text-white
              "
            >
              {locale === 'es'
                ? 'Ahora al aire'
                : 'Now playing'}
            </span>
          </div>

          <h3
            className="
              mt-3
              font-headline
              text-2xl
              font-bold
              leading-tight
              text-white
            "
          >
            {locale === 'es'
              ? 'West Island Times en vivo'
              : 'West Island Times Live'}
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-white/55
            "
          >
            {locale === 'es'
              ? 'Programación en vivo y cobertura especial desde las islas.'
              : 'Live programming and special coverage from across the islands.'}
          </p>
        </div>
      </div>
    </section>
  );
}