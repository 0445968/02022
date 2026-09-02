import type {
  CurrentUser,
  Locale,
  Profile,
} from '@/types';

/**
 * Maps a raw profiles database row into the
 * application-facing reader profile.
 */
export function mapProfileRow(
  row: Record<
    string,
    unknown
  >
): Profile {
  const legacyName =
    (
      row.name as
        | string
        | null
    ) ??
    null;

  return {
    id:
      row.id as string,

    /**
     * Retained temporarily for existing Newsroom code.
     */
    name:
      legacyName,

    /**
     * Reader-facing identity.
     *
     * The fallback keeps older environments functional if
     * StackBlitz receives this code before the migration.
     */
    displayName:
      (
        row.display_name as
          | string
          | null
      ) ??
      legacyName ??
      'Reader',

    email:
      (
        row.email as
          | string
          | null
      ) ??
      null,

    emailVerified:
      (
        row.email_verified as
          | string
          | null
      ) ??
      null,

    image:
      (
        row.image as
          | string
          | null
      ) ??
      null,

    isAuthor:
      Boolean(
        row.is_author
      ),

    isEditor:
      Boolean(
        row.is_editor
      ),

    /**
     * Legacy editorial field. New editorial presentation
     * will come from editorial_profiles.
     */
    editorialTitle:
      (
        row.editorial_title as
          | string
          | null
      ) ??
      null,

    preferredLocale:
      (
        row.preferred_locale as
          Locale
      ) ??
      'en',

    createdAt:
      row.created_at as string,

    updatedAt:
      row.updated_at as string,
  };
}

export type {
  CurrentUser,
  Locale,
  Profile,
};