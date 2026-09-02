import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

import {
  getEditorialProfilesByAccountIds,
} from '@/lib/services/editorial-profiles';

import type {
  StaffOption,
} from '@/types/editorial';

type EditorialCapability =
  | 'is_author'
  | 'is_editor';

/**
 * Loads accounts with a particular editorial capability,
 * then resolves their separate editorial bylines.
 *
 * StaffOption.id intentionally remains the account/profile
 * ID because existing story author_id and editor_id columns
 * still reference public.profiles.
 */
async function getStaffOptions(
  capability:
    EditorialCapability
): Promise<
  StaffOption[]
> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      'profiles'
    )
    .select(
      `
        id,
        name,
        editorial_title
      `
    )
    .eq(
      capability,
      true
    );

  if (error) {
    console.error(
      `Unable to load staff with ${capability}:`,
      error
    );

    throw new Error(
      `Unable to load editorial staff: ${error.message}`
    );
  }

  const profileRows =
    data ?? [];

  const editorialProfiles =
    await getEditorialProfilesByAccountIds(
      profileRows.map(
        (profile) =>
          profile.id
      )
    );

  return profileRows
    .map(
      (
        profile
      ): StaffOption => {
        const editorialProfile =
          editorialProfiles.get(
            profile.id
          );

        return {
          /**
           * Keep using the account ID until story author
           * relationships migrate to editorial_profile IDs.
           */
          id:
            profile.id,

          /**
           * Prefer the separate editorial byline.
           *
           * The legacy profile name remains a temporary
           * fallback for contributors who have not yet
           * received an editorial profile.
           */
          name:
            editorialProfile
              ?.bylineName ??
            profile.name ??
            'Unknown contributor',

          editorialTitle:
            editorialProfile
              ?.editorialTitle ??
            profile
              .editorial_title ??
            null,
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        first.name.localeCompare(
          second.name
        )
    );
}

/**
 * Accounts currently granted Author capability.
 */
export async function getAuthors(): Promise<
  StaffOption[]
> {
  return getStaffOptions(
    'is_author'
  );
}

/**
 * Accounts currently granted Editor capability.
 */
export async function getEditors(): Promise<
  StaffOption[]
> {
  return getStaffOptions(
    'is_editor'
  );
}