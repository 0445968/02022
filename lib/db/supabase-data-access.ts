import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import type { Database } from '@/lib/db/database.types';

type DataClient = SupabaseClient<Database>;

/**
 * Centralized data client factory for all server-side services.
 *
 * When DEV_AUTH_BYPASS=true, returns a cookie-free server client that
 * uses no-op cookie functions (no next/headers dependency, no session).
 * The temporary dev RLS policies allow anon access to editorial tables.
 *
 * When DEV_AUTH_BYPASS is not true, returns the normal cookie-based
 * server client that reads the user's auth session from next/headers.
 *
 * Services should ALWAYS use this instead of importing supabase-server
 * directly, so the bypass switch works from one place.
 *
 * Uses createServerClient in both paths so the return type is identical
 * — this avoids type-inference mismatches in the service layer.
 */
export async function getDataClient(): Promise<
  DataClient
> {
  if (isDevAuthBypass()) {
    // Cookie-free client: no next/headers import, no session.
    // The no-op cookie handlers mean no auth tokens are read or written.
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    ) as unknown as DataClient;
  }

  // Normal production path: cookie-based client with real session.
  const { createClient } = await import('@/lib/db/supabase-server');
  return createClient() as unknown as DataClient;
}
