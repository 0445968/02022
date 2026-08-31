import type { CurrentUser, Locale, Profile } from '@/types';

/**
 * Maps a raw profiles database row (snake_case) to the application
 * Profile type (camelCase).
 */
export function mapProfileRow(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    emailVerified: (row.email_verified as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    isAuthor: Boolean(row.is_author),
    isEditor: Boolean(row.is_editor),
    editorialTitle: (row.editorial_title as string | null) ?? null,
    preferredLocale: (row.preferred_locale as Locale) ?? 'en',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export type { CurrentUser, Locale, Profile };
