'use client';

import {
  Loader2,
} from 'lucide-react';

interface MediaLoadingStateProps {
  label?: string;
}

export function MediaLoadingState({
  label = 'Loading media…',
}: MediaLoadingStateProps) {
  return (
    <div
      className="
        flex
        min-h-[420px]
        items-center
        justify-center
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
          text-sm
          font-medium
          text-muted-foreground
        "
      >
        <Loader2
          className="
            h-4
            w-4
            animate-spin
          "
          aria-hidden
        />

        {label}
      </div>
    </div>
  );
}