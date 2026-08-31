import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md border border-border bg-white p-8 text-center">
        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 font-headline text-3xl font-bold text-deep">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
