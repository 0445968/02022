import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/database.types';

/**
 * DEV ONLY — cookie-free Supabase client for newsroom services.
 *
 * When DEV_AUTH_BYPASS=true this client is used instead of the cookie-based
 * supabase-server client. It connects with the anon key (never the service
 * role key) and carries no session, so RLS sees it as the anon role.
 * Temporary development RLS policies (prefixed "DEV BYPASS -") grant the
 * anon role access to editorial tables while testing.
 *
 * This file must NEVER be imported by Client Components. It is server-only.
 * It does NOT expose the service-role key and does NOT add any
 * NEXT_PUBLIC credentials.
 */

let cached: ReturnType<typeof supabaseCreateClient<Database>> | null = null;

export function createDataClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  cached = supabaseCreateClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}

export function isDevAuthBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === 'true';
}
