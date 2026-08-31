import { createClient } from '@/lib/db/supabase-server';
import { createDataClient, isDevAuthBypass } from '@/lib/db/supabase-data';
import { mapProfileRow } from '@/lib/auth/types';
import type { CurrentUser, Profile } from '@/types';

/**
 * Server-side auth helpers for Simply Raizal.
 *
 * These helpers run inside Server Components, Server Actions, and Route
 * Handlers. They read the Supabase session from cookies and load the
 * application-level profile. All permission checks happen server-side.
 *
 * DEV AUTH BYPASS: when DEV_AUTH_BYPASS=true, getCurrentUser() returns a
 * mock editor user (Peter Bent Archbold) without requiring a session.
 * This is for local development only and must never be enabled in
 * production.
 */

// The fixed UUID of Peter Bent Archbold from the seed data.
const DEV_USER_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

/**
 * Returns the current signed-in user and their profile, or null if not
 * authenticated. Never throws — safe to call on public pages.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // DEV BYPASS: return a mock editor user without checking cookies.
  if (isDevAuthBypass()) {
    return getDevBypassUser();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const profile: Profile | null = profileRow ? mapProfileRow(profileRow) : null;

  return {
    id: user.id,
    email: user.email ?? null,
    profile,
  };
}

/**
 * Loads Peter Bent Archbold's profile from the database using the
 * cookie-free data client. This avoids next/headers entirely.
 */
async function getDevBypassUser(): Promise<CurrentUser | null> {
  const supabase = createDataClient();

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', DEV_USER_ID)
    .maybeSingle();

  if (!profileRow) return null;

  const profile = mapProfileRow(profileRow);

  return {
    id: DEV_USER_ID,
    email: profile.email,
    profile,
  };
}

/**
 * Returns the current user or throws a Next.js notFound / redirect-ready
 * error. Use this at the top of any page that requires a signed-in user.
 * Callers should check the result and redirect to sign-in if null.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new RequireAuthError();
  }
  return user;
}

/**
 * Returns the current user only if they are an author (isAuthor === true).
 * Throws RequireAuthError if not signed in, and RequireRoleError if signed
 * in but not an author.
 */
export async function requireAuthor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.profile?.isAuthor) {
    throw new RequireRoleError('author');
  }
  return user;
}

/**
 * Returns the current user only if they are an editor (isEditor === true).
 * Throws RequireAuthError if not signed in, and RequireRoleError if signed
 * in but not an editor.
 */
export async function requireEditor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.profile?.isEditor) {
    throw new RequireRoleError('editor');
  }
  return user;
}

/**
 * Returns the current user only if they are an author OR an editor.
 * Used by the newsroom entrance which admits both roles.
 */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.profile?.isAuthor && !user.profile?.isEditor) {
    throw new RequireRoleError('staff');
  }
  return user;
}

/** Thrown when no user is signed in. Callers redirect to the sign-in page. */
export class RequireAuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'RequireAuthError';
  }
}

/** Thrown when the signed-in user lacks the required editorial role. */
export class RequireRoleError extends Error {
  role: 'author' | 'editor' | 'staff';
  constructor(role: 'author' | 'editor' | 'staff') {
    super(`Role "${role}" required`);
    this.name = 'RequireRoleError';
    this.role = role;
  }
}
