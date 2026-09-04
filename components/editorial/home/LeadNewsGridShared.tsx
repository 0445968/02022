import Image from 'next/image';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

export type StorySource =
  | HomepagePlacement
  | FrontPageStoryOption;

export function getStory(
  source: StorySource
): FrontPageStoryOption {
  if (
    'story' in source
  ) {
    return source.story;
  }

  return source;
}

export function getArticleHref(
  locale: Locale,
  source: StorySource
) {
  const story =
    getStory(
      source
    );

  return localizedPath(
    locale,
    `/article/${story.slug}`
  );
}

export function getCategory(
  locale: Locale,
  source: StorySource
) {
  const story =
    getStory(
      source
    );

  const category =
    story.primaryCategory;

  if (!category) {
    return null;
  }

  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

export function StoryImage({
  source,
  className = '',
  priority = false,
}: {
  source: StorySource;
  className?: string;
  priority?: boolean;
}) {
  const story =
    getStory(
      source
    );

  const image =
    story.featuredImage;

  if (!image) {
    return (
      <div
        className={`
          rounded-md
          bg-surface-subtle
          ${className}
        `}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-md
        bg-surface-subtle
        ${className}
      `}
    >
      <Image
        src={image.url}
        alt={
          image.altText ||
          story.headline
        }
        fill
        priority={priority}
        className="
          object-cover
          transition-transform
          duration-500
          group-hover:scale-[1.015]
        "
        sizes="
          (max-width: 768px) 100vw,
          (max-width: 1280px) 55vw,
          760px
        "
      />
    </div>
  );
}

export function EmptySlot({
  locale,
  className = '',
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    <div
      className={`
        flex
        min-h-[120px]
        items-center
        justify-center
        rounded-md
        bg-surface-subtle
        px-4
        text-center
        text-xs
        text-muted-foreground
        ${className}
      `}
    >
      {locale === 'es'
        ? 'Historia no configurada'
        : 'Story not configured'}
    </div>
  );
}