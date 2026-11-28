import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/db/database.types';

/** Preserve every session cookie chunk and forward refreshed request cookies.
 * The response must be read AFTER auth.getUser(), since refresh can replace it.
 * Neither this adapter nor middleware is an authorization decision.
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          for (const {name,value} of cookiesToSet) request.cookies.set(name,value);
          // Rebuild request header overrides AFTER cookie mutation so downstream
          // route handlers see the same session as the response.
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          for (const cookie of previous) response.cookies.set(cookie);
          for (const {name,value,options} of cookiesToSet) response.cookies.set(name,value,options);
        },
      },
    }
  );
  return { client, getResponse: () => response };
}
