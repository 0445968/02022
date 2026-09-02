/**
 * Shared application types for West Island Times.
 *
 * Authentication is handled by Supabase Auth.
 * Profile data represents the reader account and its
 * additional editorial capabilities.
 */

export type Locale =
  | 'en'
  | 'es';

export interface Profile {
  id: string;

  /**
   * Existing internal/account name.
   *
   * Keep this during the editorial-profile migration so
   * current Newsroom code continues working.
   */
  name:
    | string
    | null;

  /**
   * Reader-facing identity used for comments and other
   * community features.
   *
   * This is independent of the editorial byline.
   */
  displayName: string;

  email:
    | string
    | null;

  emailVerified:
    | string
    | null;

  image:
    | string
    | null;

  /**
   * Editorial capabilities.
   *
   * If both are false, this account is a normal Viewer and
   * must not have access to the Newsroom.
   */
  isAuthor: boolean;

  isEditor: boolean;

  /**
   * Legacy editorial field.
   *
   * This remains temporarily while existing Newsroom code
   * migrates to editorial_profiles.
   */
  editorialTitle:
    | string
    | null;

  preferredLocale:
    Locale;

  createdAt: string;

  updatedAt: string;
}

/**
 * Supabase authenticated user plus their West Island Times
 * reader profile.
 */
export interface CurrentUser {
  id: string;

  email:
    | string
    | null;

  profile:
    | Profile
    | null;
}

/**
 * Display labels only.
 *
 * Authorization must continue using isAuthor and isEditor.
 */
export type UserRole =
  | 'user'
  | 'author'
  | 'editor'
  | 'author-editor';