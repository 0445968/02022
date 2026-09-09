'use client';

import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaPaginationProps {
  page: number;

  totalPages: number;

  total: number;

  perPage: number;

  onPageChange: (
    page: number
  ) => void;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaPagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
}: MediaPaginationProps) {
  if (
    totalPages <= 1
  ) {
    return null;
  }

  const start =
    (page - 1) *
      perPage +
    1;

  const end =
    Math.min(
      page * perPage,
      total
    );

  return (
    <div
      className="
        mt-8
        flex
        flex-col
        gap-3
        border-t
        border-border
        pt-5
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      {/* ================================================= */}
      {/* RANGE */}
      {/* ================================================= */}

      <p
        className="
          text-sm
          text-muted-foreground
        "
      >
        Showing{' '}
        <span
          className="
            font-semibold
            text-foreground
          "
        >
          {start}
        </span>
        {' '}–{' '}
        <span
          className="
            font-semibold
            text-foreground
          "
        >
          {end}
        </span>
        {' '}of{' '}
        <span
          className="
            font-semibold
            text-foreground
          "
        >
          {total}
        </span>
      </p>

      {/* ================================================= */}
      {/* CONTROLS */}
      {/* ================================================= */}

      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <button
          type="button"
          disabled={
            page <= 1
          }
          onClick={() =>
            onPageChange(
              Math.max(
                1,
                page - 1
              )
            )
          }
          className="
            inline-flex
            h-9
            items-center
            justify-center
            gap-2
            rounded-lg
            border
            border-border
            bg-white
            px-3
            text-sm
            font-semibold
            text-foreground
            transition
            hover:bg-surface-muted
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <ChevronLeft
            className="
              h-4
              w-4
            "
            aria-hidden
          />

          Previous
        </button>

        <div
          className="
            flex
            h-9
            items-center
            justify-center
            rounded-lg
            border
            border-border
            bg-surface-muted
            px-3
            text-sm
            font-semibold
            text-foreground
          "
        >
          Page {page} of{' '}
          {totalPages}
        </div>

        <button
          type="button"
          disabled={
            page >=
            totalPages
          }
          onClick={() =>
            onPageChange(
              Math.min(
                totalPages,
                page + 1
              )
            )
          }
          className="
            inline-flex
            h-9
            items-center
            justify-center
            gap-2
            rounded-lg
            border
            border-border
            bg-white
            px-3
            text-sm
            font-semibold
            text-foreground
            transition
            hover:bg-surface-muted
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          Next

          <ChevronRight
            className="
              h-4
              w-4
            "
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}