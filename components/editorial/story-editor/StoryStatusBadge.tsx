'use client';

import type {
  StoryStatus,
} from '@/lib/db/database.types';

import {
  statusLabel,
} from '@/types/editorial';

import {
  cn,
} from '@/lib/utils';

interface StoryStatusBadgeProps {
  status: StoryStatus;
  locale?: 'en' | 'es';
}

export function StoryStatusBadge({
  status,
  locale = 'en',
}: StoryStatusBadgeProps) {
  const colors: Record<
    StoryStatus,
    string
  > = {
    draft:
      'rounded-full border-border bg-surface-muted text-foreground',

    in_review:
      'rounded-full border-highlight/40 bg-highlight/20 text-deep',

    scheduled:
      'rounded-full border-primary/30 bg-primary/10 text-primary',

    published:
      'rounded-full border-live/30 bg-live/10 text-live',

    archived:
      'rounded-full border-border bg-surface-subtle text-muted-foreground',
  };

  return (
    <span
      className={cn(
        `
          inline-flex
          items-center
          border
          px-2
          py-0.5
          text-xs
          font-semibold
          uppercase
          tracking-wide
        `,
        colors[status]
      )}
    >
      {statusLabel(
        status,
        locale
      )}
    </span>
  );
}