import { Search } from 'lucide-react';

interface UtilityBarProps {
  date: string;
  weather: string;
  islands: string;
}

/**
 * Top utility bar: date, weather, and island names.
 * Thin, high-contrast, sits above the masthead.
 */
export function UtilityBar({ date, weather, islands }: UtilityBarProps) {
  return (
    <div className="border-b border-border bg-deep text-white">
      <div className="container-wide flex h-8 items-center justify-between text-[0.6875rem] font-medium uppercase tracking-wide">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">{date}</span>
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
            {weather}
          </span>
        </div>
        <div className="truncate text-center">
          <span className="opacity-90">{islands}</span>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:underline"
            aria-label="Search (coming soon)"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
