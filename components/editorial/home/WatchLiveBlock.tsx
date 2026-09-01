import Image from 'next/image';
import Link from 'next/link';

import {
  ArrowRight,
  Play,
  RadioTower,
} from 'lucide-react';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface WatchLiveBlockProps {
  locale: Locale;

  feature:
    | HomepagePlacement
    | null;
}

function getCategoryName(
  locale: Locale,
  placement: HomepagePlacement
) {
  const category =
    placement.story
      .primaryCategory;

  if (!category) {
    return null;
  }

  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

function WatchFeature({
  locale,
  placement,
}: {
  locale: Locale;
  placement:
    | HomepagePlacement
    | null;
}) {
  if (!placement) {
    return (
      <div
        className="
          flex
          min-h-[360px]
          items-center
          justify-center
          rounded-md
          bg-surface-subtle
          px-6
          text-center
          text-sm
          text-muted-foreground
        "
      >
        {locale === 'es'
          ? 'No hay video destacado configurado.'
          : 'No featured video configured.'}
      </div>
    );
  }

  const image =
    placement.story
      .featuredImage;

  const category =
    getCategoryName(
      locale,
      placement
    );

  return (
    <article className="group">
      <Link
        href={localizedPath(
          locale,
          `/article/${placement.story.slug}`
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
            aspect-[16/9]
            overflow-hidden
            rounded-md
            bg-surface-subtle
          "
        >
          {image && (
            <Image
              src={
                image.url
              }
              alt={
                image.altText ||
                placement.story
                  .headline
              }
              fill
              className="
                object-cover
                transition-transform
                duration-500
                group-hover:scale-[1.015]
              "
              sizes="
                (max-width: 1024px) 100vw,
                70vw
              "
            />
          )}

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-black/55
              via-black/10
              to-transparent
            "
          />

          <div
            className="
              absolute
              bottom-4
              left-4
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              shadow-sm
            "
          >
            <Play
              className="
                ml-0.5
                h-5
                w-5
                fill-current
              "
              aria-hidden
            />
          </div>
        </div>

        <div className="pt-4">
          {category && (
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.13em]
                text-breaking
              "
            >
              {category}
            </p>
          )}

          <h3
            className="
              mt-1.5
              max-w-3xl
              font-headline
              text-2xl
              font-bold
              leading-[1.08]
              tracking-[-0.025em]
              text-black
              sm:text-3xl
            "
          >
            {
              placement.story
                .headline
            }
          </h3>
        </div>
      </Link>
    </article>
  );
}

function LivePanel({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <aside
      className="
        flex
        h-full
        flex-col
        rounded-md
        bg-black
        p-5
        text-white
        sm:p-6
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div
          className="
            inline-flex
            items-center
            gap-2
            text-[11px]
            font-black
            uppercase
            tracking-[0.12em]
            text-white
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

          {locale === 'es'
            ? 'En vivo'
            : 'Live'}
        </div>

        <RadioTower
          className="
            h-5
            w-5
            text-white/60
          "
          aria-hidden
        />
      </div>

      <div
        className="
          mt-auto
          pt-16
        "
      >
        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.12em]
            text-white/55
          "
        >
          West Island Times
        </p>

        <h3
          className="
            mt-2
            font-headline
            text-2xl
            font-bold
            leading-[1.08]
            tracking-[-0.02em]
            text-white
          "
        >
          {locale === 'es'
            ? 'Cobertura en vivo desde el Archipiélago'
            : 'Live coverage from across the Archipelago'}
        </h3>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-white/65
          "
        >
          {locale === 'es'
            ? 'Noticias de última hora, eventos y transmisiones especiales.'
            : 'Breaking news, events and special broadcasts.'}
        </p>

        <Link
          href={localizedPath(
            locale,
            '/live'
          )}
          className="
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-md
            bg-white
            px-4
            py-2.5
            text-xs
            font-black
            uppercase
            tracking-[0.08em]
            text-black
            transition-opacity
            hover:opacity-85
          "
        >
          {locale === 'es'
            ? 'Ver en vivo'
            : 'Watch live'}

          <ArrowRight
            className="h-4 w-4"
            aria-hidden
          />
        </Link>
      </div>
    </aside>
  );
}

export function WatchLiveBlock({
  locale,
  feature,
}: WatchLiveBlockProps) {
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
        <div
          className="
            mb-5
            flex
            items-end
            justify-between
            gap-4
            border-b-2
            border-black
            pb-2
          "
        >
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
            {locale === 'es'
              ? 'Ver'
              : 'Watch'}
          </h2>

          <Link
            href={localizedPath(
              locale,
              '/watch'
            )}
            className="
              inline-flex
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
              ? 'Todos los videos'
              : 'All videos'}

            <ArrowRight
              className="h-3.5 w-3.5"
              aria-hidden
            />
          </Link>
        </div>

        <div
          className="
            grid
            gap-6
            lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.75fr)]
          "
        >
          <WatchFeature
            locale={locale}
            placement={
              feature
            }
          />

          <LivePanel
            locale={
              locale
            }
          />
        </div>
      </div>
    </section>
  );
}