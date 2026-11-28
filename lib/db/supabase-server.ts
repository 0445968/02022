import { createServerClient } from '@supabase/ssr';
import type { SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from './database.types';

// Resolve the request store in its own async helper, while preserving the
// synchronous client factory used by server services. No unsafe Next cast.
async function requestCookieStore() {
  return await cookies();
}

export function createClient() {
  // Resolve cookies only inside awaited SDK callbacks. An eager rejected
  // promise during Next 13 prerender can escape the static-generation worker.
  // Session-dependent pages and GET routes must opt into dynamic rendering.
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await requestCookieStore()).getAll();
        },

        async setAll(
          cookiesToSet: Parameters<SetAllCookies>[0]
        ) {
          const store = await requestCookieStore();
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                store.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Server Components cannot always mutate cookies.
            // Middleware handles session refresh.
          }
        },
      },
    }
  );
}
