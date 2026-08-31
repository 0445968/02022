import { Newspaper } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-3">
        <Newspaper className="h-8 w-8 animate-pulse text-primary" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
