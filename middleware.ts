import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/db/supabase-middleware';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  stripLocale,
} from '@/lib/i18n/config';

/**
 * Middleware does two things:
 *  1. Refreshes the Supabase auth session on every request.
 *  2. Handles locale routing: ensures every public/auth path carries a
 *     locale prefix (en/es), defaulting to the cookie or browser preference.
 *     /newsroom paths are NOT locale-prefixed (the newsroom is an internal
 *     tool with a single interface language, set per user).
 */
export async function middleware(request: NextRequest) {
  const { client, response } = createMiddlewareClient(request);

  // Refresh the session — this also sets updated auth cookies on the response.
  const {
    data: { user },
  } = await client.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ---- Locale handling -------------------------------------------------
// Skip locale routing for Next internals, API routes,
// the Newsroom, and the authenticated reader account.
// Newsroom and account language come from the user's
// preferred profile locale.
  const isAccountRoute =
  pathname ===
    '/account' ||
  pathname.startsWith(
    '/account/'
  );

const isInternal =
  pathname.startsWith(
    '/_next'
  ) ||
  pathname.startsWith(
    '/api'
  ) ||
  pathname.includes(
    '.'
  ) ||
  pathname.startsWith(
    '/newsroom'
  ) ||
  isAccountRoute;

  if (!isInternal) {
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    const hasLocale = isLocale(firstSegment);

    if (!hasLocale) {
      // No locale in the URL — pick one and redirect.
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
      const browser =
        request.headers
          .get('accept-language')
          ?.split(',')[0]
          ?.split('-')[0]
          .toLowerCase() ?? defaultLocale;
      const locale = isLocale(cookieLocale) ? cookieLocale : isLocale(browser) ? browser : defaultLocale;

      const rest = stripLocale(pathname);
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${rest === '/' ? '' : rest}`;
      url.search = request.nextUrl.search;
      const redirect = NextResponse.redirect(url);
      // Preserve auth cookie updates from the middleware client.
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }

    // Persist the chosen locale for next visit.
    response.cookies.set(LOCALE_COOKIE, firstSegment, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    response.headers.set(LOCALE_HEADER, firstSegment);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
