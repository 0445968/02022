'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, send to your error tracking service.
    // Never expose the stack trace to the user.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-interface antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
          <div className="w-full max-w-md border border-border bg-white p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-breaking" aria-hidden />
            <h1 className="mt-4 font-headline text-2xl font-bold text-deep">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
