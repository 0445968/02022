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
  // Next 13 returns a store; Next 15/16 return a Promise. Capture it in the
  // request context and await inside the SDK's supported async callbacks.
  const cookieStore = requestCookieStore();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },

        async setAll(
          cookiesToSet: Parameters<SetAllCookies>[0]
        ) {
          const store = await cookieStore;
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
