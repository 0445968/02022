'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { StoryListItem, Category, StaffOption } from '@/types/editorial';
import type { StoryStatus, StoryLanguage, IslandScope, AccessLevel } from '@/lib/db/database.types';
import { statusLabel, accessLabel, islandLabel, categoryLabel } from '@/types/editorial';
import type { Locale } from '@/types';

interface StoriesDashboardProps {
  dict: Dictionary;
  stories: StoryListItem[];
  page: number;
  totalPages: number;
  total: number;
  categories: Category[];
  authors: StaffOption[];
  currentFilters: {
    search: string;
    status: StoryStatus | 'all';
    language: StoryLanguage | 'all';
    authorId: string | 'all';
    categoryId: string | 'all';
    island: IslandScope | 'all';
    sortBy: 'updated_desc' | 'updated_asc' | 'published_desc' | 'headline_asc';
  };
}

const STATUSES: (StoryStatus | 'all')[] = ['all', 'draft', 'in_review', 'scheduled', 'published', 'archived'];
const LANGUAGES: (StoryLanguage | 'all')[] = ['all', 'en', 'es'];
const ISLANDS: (IslandScope | 'all')[] = ['all', 'san_andres', 'old_providence', 'saint_catalina', 'archipelago', 'none'];
const SORTS: StoriesDashboardProps['currentFilters']['sortBy'][] = ['updated_desc', 'updated_asc', 'published_desc', 'headline_asc'];

export function StoriesDashboard({ dict, stories, page, totalPages, total, categories, authors, currentFilters }: StoriesDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentFilters.search);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all' || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== 'page') params.delete('page');
    router.push(`/newsroom/stories?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter('search', searchInput);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/newsroom/stories?${params.toString()}`);
  }

  return (
    <div className="mt-6">
      {/* Filters bar */}
      <div className="flex flex-col gap-3 border border-border bg-white p-4 lg:flex-row lg:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={dict.stories.searchPlaceholder}
            className="h-9 w-full border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={dict.common.search}
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label={dict.stories.filterStatus}
            value={currentFilters.status}
            onChange={(v) => updateFilter('status', v)}
            options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? dict.common.all : statusLabel(s, 'en') }))}
          />
          <FilterSelect
            label={dict.stories.filterLanguage}
            value={currentFilters.language}
            onChange={(v) => updateFilter('language', v)}
            options={LANGUAGES.map((l) => ({ value: l, label: l === 'all' ? dict.common.all : l === 'en' ? dict.common.languageEN : dict.common.languageES }))}
          />
          <FilterSelect
            label={dict.stories.filterAuthor}
            value={currentFilters.authorId}
            onChange={(v) => updateFilter('author', v)}
            options={[
              { value: 'all', label: dict.common.all },
              ...authors.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <FilterSelect
            label={dict.stories.filterCategory}
            value={currentFilters.categoryId}
            onChange={(v) => updateFilter('category', v)}
            options={[
              { value: 'all', label: dict.common.all },
              ...categories.map((c) => ({ value: c.id, label: c.nameEn })),
            ]}
          />
          <FilterSelect
            label={dict.stories.filterIsland}
            value={currentFilters.island}
            onChange={(v) => updateFilter('island', v)}
            options={ISLANDS.map((i) => ({ value: i, label: i === 'all' ? dict.common.all : islandLabel(i, 'en') }))}
          />
          <FilterSelect
            label={dict.stories.sortBy}
            value={currentFilters.sortBy}
            onChange={(v) => updateFilter('sort', v)}
            options={SORTS.map((s) => ({ value: s, label: dict.stories[`sort${s.charAt(0).toUpperCase() + s.slice(1)}` as keyof typeof dict.stories] as string }))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted text-left">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.stories.columns.headline}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.stories.columns.status}</th>
              <th className="hidden px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">{dict.stories.columns.language}</th>
              <th className="hidden px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">{dict.stories.columns.author}</th>
              <th className="hidden px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">{dict.stories.columns.editor}</th>
              <th className="hidden px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground xl:table-cell">{dict.stories.columns.category}</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.stories.columns.updated}</th>
            </tr>
          </thead>
          <tbody>
            {stories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-headline text-lg font-semibold text-deep">{dict.stories.noStories}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dict.stories.noStoriesDesc}</p>
                  <Link
                    href="/newsroom/stories/new"
                    className="mt-4 inline-flex h-9 items-center bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    {dict.stories.createFirst}
                  </Link>
                </td>
              </tr>
            ) : (
              stories.map((story) => (
                <tr key={story.id} className="border-b border-border/60 transition-colors hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/newsroom/stories/${story.id}/edit`}
                      className="font-medium text-deep hover:text-primary focus-visible:outline-none focus-visible:underline"
                    >
                      {story.headline || '(untitled)'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={story.status} dict={dict} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="font-semibold uppercase tracking-wide text-muted-foreground">{story.language}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{story.authorName ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{story.editorName ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                    {story.primaryCategoryNameEn ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(story.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {dict.pagination.page.replace('{page}', String(page)).replace('{total}', String(totalPages))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-8 items-center gap-1 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {dict.pagination.previous}
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex h-8 items-center gap-1 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {dict.pagination.next}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border border-border bg-white px-2 text-xs font-medium text-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status, dict }: { status: StoryStatus; dict: Dictionary }) {
  const colors: Record<StoryStatus, string> = {
    draft: 'bg-surface-muted text-foreground border-border',
    in_review: 'bg-highlight/20 text-deep border-highlight/40',
    scheduled: 'bg-primary/10 text-primary border-primary/30',
    published: 'bg-live/10 text-live border-live/30',
    archived: 'bg-surface-subtle text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${colors[status]}`}>
      {statusLabel(status, 'en')}
    </span>
  );
}
