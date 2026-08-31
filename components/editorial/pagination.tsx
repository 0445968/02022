import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

interface PaginationProps {
  page: number;
  totalPages: number;
  dict: Dictionary;
  basePath: string;
}

export function Pagination({ page, totalPages, dict, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  function pageHref(p: number): string {
    return p === 1 ? basePath : `${basePath}?page=${p}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-between border-t border-border pt-4" aria-label="Pagination">
      <p className="text-xs text-muted-foreground">
        {dict.pagination.page.replace('{page}', String(page)).replace('{total}', String(totalPages))}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={pageHref(page - 1)}
            className="inline-flex h-8 items-center gap-1 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            {dict.pagination.previous}
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={pageHref(page + 1)}
            className="inline-flex h-8 items-center gap-1 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dict.pagination.next}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
}
