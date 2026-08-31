'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function SignOutButton({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-1.5 border border-border bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:border-breaking hover:text-breaking focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {dict.newsroom.signOut}
    </button>
  );
}
