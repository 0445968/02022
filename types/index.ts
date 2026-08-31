/**
 * Shared application types for Simply Raizal.
 * These mirror the `profiles` database table and are used across
 * server and client code.
 */

export type Locale = 'en' | 'es';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  isAuthor: boolean;
  isEditor: boolean;
  editorialTitle: string | null;
  preferredLocale: Locale;
  createdAt: string;
  updatedAt: string;
}

/** A user bundle returned by the auth helpers: the Supabase auth user
 *  plus their application-level profile. */
export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile | null;
}

export type UserRole = 'user' | 'author' | 'editor' | 'author-editor';
