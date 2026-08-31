import Link from 'next/link';
import type { Locale } from '@/types';
import type { PublicStoryListItem } from '@/types/editorial';
import { categoryLabel, islandLabel } from '@/types/editorial';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

interface StoryCardProps {
  story: PublicStoryListItem;
  locale: Locale;
  dict: Dictionary;
  variant?: 'default' | 'lead' | 'compact';
}

export function StoryCard({ story, locale, dict, variant = 'default' }: StoryCardProps) {
  const href = localizedPath(locale, `/article/${story.slug}`);
  const categoryName =
    story.primaryCategoryNameEn && story.primaryCategoryNameEs
      ? categoryLabel({ nameEn: story.primaryCategoryNameEn, nameEs: story.primaryCategoryNameEs }, locale)
      : null;

  if (variant === 'lead') {
    return (
      <article className="group">
        {story.featuredImageUrl && (
          <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img
              src={story.featuredImageUrl}
              alt={story.featuredImageAlt ?? ''}
              className="mb-4 aspect-[16/9] w-full bg-surface-subtle object-cover"
            />
          </Link>
        )}
        {categoryName && (
          <Link
            href={localizedPath(locale, `/category/${story.primaryCategorySlug}`)}
            className="eyebrow text-primary hover:underline"
          >
            {categoryName}
          </Link>
        )}
        <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <h2 className="mt-2 font-headline text-2xl font-bold leading-tight text-deep transition-opacity group-hover:opacity-80 sm:text-3xl lg:text-4xl">
            {story.headline}
          </h2>
        </Link>
        {story.summary && (
          <p className="mt-3 max-w-prose text-base leading-relaxed text-muted-foreground">
            {story.summary}
          </p>
        )}
        <StoryMeta story={story} dict={dict} />
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="group border-b border-border py-4">
        <div className="flex gap-4">
          {story.featuredImageUrl && (
            <Link href={href} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <img
                src={story.featuredImageUrl}
                alt={story.featuredImageAlt ?? ''}
                className="h-16 w-24 bg-surface-subtle object-cover"
              />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            {categoryName && (
              <span className="eyebrow text-primary">{categoryName}</span>
            )}
            <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <h3 className="mt-1 font-headline text-base font-semibold leading-snug text-deep transition-opacity group-hover:opacity-80">
                {story.headline}
              </h3>
            </Link>
            <StoryMeta story={story} dict={dict} compact />
          </div>
        </div>
      </article>
    );
  }

  // default
  return (
    <article className="group flex flex-col">
      {story.featuredImageUrl ? (
        <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img
            src={story.featuredImageUrl}
            alt={story.featuredImageAlt ?? ''}
            className="mb-3 aspect-[4/3] w-full bg-surface-subtle object-cover"
          />
        </Link>
      ) : (
        <div className="mb-3 aspect-[4/3] w-full bg-surface-subtle" aria-hidden />
      )}
      {categoryName && (
        <Link
          href={localizedPath(locale, `/category/${story.primaryCategorySlug}`)}
          className="eyebrow text-primary hover:underline"
        >
          {categoryName}
        </Link>
      )}
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h3 className="mt-1.5 font-headline text-lg font-semibold leading-snug text-deep transition-opacity group-hover:opacity-80">
          {story.headline}
        </h3>
      </Link>
      {story.summary && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {story.summary}
        </p>
      )}
      <StoryMeta story={story} dict={dict} />
    </article>
  );
}

function StoryMeta({ story, dict, compact }: { story: PublicStoryListItem; dict: Dictionary; compact?: boolean }) {
  return (
    <div className={`mt-2 flex items-center gap-2 text-xs text-muted-foreground ${compact ? '' : 'mt-auto pt-3'}`}>
      {story.authorName && (
        <span>
          {dict.common.by} {story.authorName}
        </span>
      )}
      {story.publishedAt && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={story.publishedAt}>
            {new Date(story.publishedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </>
      )}
      {story.language === 'es' && (
        <>
          <span aria-hidden>·</span>
          <span className="font-semibold uppercase tracking-wide">ES</span>
        </>
      )}
    </div>
  );
}
