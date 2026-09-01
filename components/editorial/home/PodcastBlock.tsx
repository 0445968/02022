import Link from 'next/link';

import {
  ArrowRight,
  Headphones,
  Play,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Locale,
} from '@/types';

interface PodcastBlockProps {
  locale: Locale;
}

const placeholderEpisodes = [
  {
    id: 'episode-1',
    title:
      'What is changing across the Archipelago this week',
    show:
      'West Island Times Daily',
    duration:
      '24 min',
  },
  {
    id: 'episode-2',
    title:
      'The stories shaping island life',
    show:
      'Island Conversations',
    duration:
      '31 min',
  },
  {
    id: 'episode-3',
    title:
      'Culture, memory and the next generation',
    show:
      'Voices of the Archipelago',
    duration:
      '42 min',
  },
];

export function PodcastBlock({
  locale,
}: PodcastBlockProps) {
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
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <Headphones
                className="
                  h-4
                  w-4
                  text-breaking
                "
                aria-hidden
              />

              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.12em]
                  text-breaking
                "
              >
                {locale === 'es'
                  ? 'Escuchar'
                  : 'Listen'}
              </span>
            </div>

            <h2
              className="
                mt-1
                font-headline
                text-2xl
                font-bold
                tracking-[-0.025em]
                text-black
                sm:text-3xl
              "
            >
              Podcasts
            </h2>
          </div>

          <Link
            href={localizedPath(
              locale,
              '/podcasts'
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
              ? 'Todos los podcasts'
              : 'All podcasts'}

            <ArrowRight
              className="h-3.5 w-3.5"
              aria-hidden
            />
          </Link>
        </div>

        {/* Main layout */}

        <div
          className="
            mt-5
            grid
            gap-7
            lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]
          "
        >
          {/* Featured show */}

          <article
            className="
              grid
              gap-5
              sm:grid-cols-[180px_minmax(0,1fr)]
              sm:items-center
            "
          >
            <div
              className="
                flex
                aspect-square
                items-center
                justify-center
                rounded-md
                bg-black
                p-6
                text-white
              "
            >
              <div
                className="
                  text-center
                "
              >
                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.16em]
                    text-white/55
                  "
                >
                  West Island Times
                </p>

                <p
                  className="
                    mt-2
                    font-headline
                    text-2xl
                    font-bold
                    leading-[1.02]
                  "
                >
                  Island
                  <br />
                  Conversations
                </p>
              </div>
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.12em]
                  text-breaking
                "
              >
                {locale === 'es'
                  ? 'Podcast destacado'
                  : 'Featured podcast'}
              </p>

              <h3
                className="
                  mt-2
                  font-headline
                  text-2xl
                  font-bold
                  leading-[1.08]
                  tracking-[-0.02em]
                  text-black
                "
              >
                Island Conversations
              </h3>

              <p
                className="
                  mt-2
                  max-w-lg
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Conversaciones profundas con las personas que están dando forma al futuro del Archipiélago.'
                  : 'Long-form conversations with the people shaping the future of the Archipelago.'}
              </p>

              <Link
                href={localizedPath(
                  locale,
                  '/podcasts'
                )}
                className="
                  mt-4
                  inline-flex
                  h-10
                  items-center
                  gap-2
                  rounded-md
                  bg-black
                  px-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-white
                  transition-opacity
                  hover:opacity-80
                "
              >
                <Play
                  className="
                    h-3.5
                    w-3.5
                    fill-current
                  "
                  aria-hidden
                />

                {locale === 'es'
                  ? 'Escuchar'
                  : 'Listen'}
              </Link>
            </div>
          </article>

          {/* Latest episodes */}

          <div
            className="
              border-t
              border-border
              lg:border-l
              lg:border-t-0
              lg:pl-7
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                py-3
                lg:pt-0
              "
            >
              <h3
                className="
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.12em]
                  text-black
                "
              >
                {locale === 'es'
                  ? 'Episodios recientes'
                  : 'Latest episodes'}
              </h3>
            </div>

            <div
              className="
                divide-y
                divide-border
                border-t
                border-border
              "
            >
              {placeholderEpisodes.map(
                (
                  episode
                ) => (
                  <article
                    key={
                      episode.id
                    }
                  >
                    <Link
                      href={localizedPath(
                        locale,
                        '/podcasts'
                      )}
                      className="
                        group
                        grid
                        grid-cols-[34px_minmax(0,1fr)]
                        gap-3
                        py-4
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-primary
                      "
                    >
                      <div
                        className="
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          rounded-full
                          bg-black
                          text-white
                        "
                      >
                        <Play
                          className="
                            ml-0.5
                            h-3
                            w-3
                            fill-current
                          "
                          aria-hidden
                        />
                      </div>

                      <div
                        className="
                          min-w-0
                        "
                      >
                        <h4
                          className="
                            font-headline
                            text-base
                            font-bold
                            leading-[1.16]
                            text-black
                            transition-opacity
                            group-hover:opacity-65
                          "
                        >
                          {
                            episode.title
                          }
                        </h4>

                        <div
                          className="
                            mt-1.5
                            flex
                            flex-wrap
                            items-center
                            gap-2
                            text-[10px]
                            font-medium
                            uppercase
                            tracking-[0.08em]
                            text-muted-foreground
                          "
                        >
                          <span>
                            {
                              episode.show
                            }
                          </span>

                          <span
                            className="
                              h-1
                              w-1
                              rounded-full
                              bg-muted-foreground/40
                            "
                          />

                          <span>
                            {
                              episode.duration
                            }
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}