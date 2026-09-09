'use client';

import {
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';

interface MediaErrorStateProps {
  message: string;

  onRetry?: () => void;
}

export function MediaErrorState({
  message,
  onRetry,
}: MediaErrorStateProps) {
  return (
    <div
      className="
        mt-6
        flex
        items-start
        gap-3
        rounded-xl
        border
        border-breaking/20
        bg-breaking/5
        px-4
        py-4
        text-sm
        text-breaking
      "
    >
      <AlertCircle
        className="
          mt-0.5
          h-4
          w-4
          shrink-0
        "
        aria-hidden
      />

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <p
          className="
            font-semibold
          "
        >
          Media Library could not be loaded.
        </p>

        <p
          className="
            mt-1
            leading-5
            opacity-80
          "
        >
          {message}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={
              onRetry
            }
            className="
              mt-3
              inline-flex
              h-9
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-breaking/20
              bg-white
              px-3
              text-xs
              font-bold
              text-breaking
              transition
              hover:bg-breaking/5
            "
          >
            <RefreshCcw
              className="
                h-3.5
                w-3.5
              "
              aria-hidden
            />

            Try again
          </button>
        )}
      </div>
    </div>
  );
}