import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  import type {
    Database,
  } from '@/lib/db/database.types';
  
  import type {
    EditorialProfile,
    MediaAsset,
  } from '@/types/editorial';
  
  type EditorialProfileRow =
    Database['public']['Tables']['editorial_profiles']['Row'];
  
  type MediaAssetRow =
    Database['public']['Tables']['media_assets']['Row'];
  
  /* =========================================================
     ROW MAPPERS
  ========================================================= */
  
  function mapMediaAsset(
    row: MediaAssetRow
  ): MediaAsset {
    return {
      id:
        row.id,
  
      url:
        row.url,
  
      storagePath:
        row.storage_path,
  
      fileName:
        row.file_name,
  
      mimeType:
        row.mime_type,
  
      width:
        row.width,
  
      height:
        row.height,
  
      fileSize:
        row.file_size,
  
      altText:
        row.alt_text,
  
      caption:
        row.caption,
  
      credit:
        row.credit,
  
      uploadedBy:
        row.uploaded_by,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  function mapEditorialProfile(
    row: EditorialProfileRow,
    headshots: Map<
      string,
      MediaAsset
    >
  ): EditorialProfile {
    return {
      id:
        row.id,
  
      accountId:
        row.account_id,
  
      bylineName:
        row.byline_name,
  
      slug:
        row.slug,
  
      editorialTitle:
        row.editorial_title,
  
      bio:
        row.bio,
  
      headshot:
        row.headshot_media_id
          ? headshots.get(
              row.headshot_media_id
            ) ?? null
          : null,
  
      bylineStatus:
        row.byline_status,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  /* =========================================================
     HEADSHOT RESOLUTION
  ========================================================= */
  
  async function resolveEditorialProfiles(
    rows: EditorialProfileRow[]
  ): Promise<
    EditorialProfile[]
  > {
    if (
      rows.length ===
      0
    ) {
      return [];
    }
  
    const headshotIds =
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.headshot_media_id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(id)
            )
        )
      );
  
    const headshots =
      new Map<
        string,
        MediaAsset
      >();
  
    if (
      headshotIds.length >
      0
    ) {
      const supabase =
        await getDataClient();
  
      const {
        data,
        error,
      } = await supabase
        .from(
          'media_assets'
        )
        .select('*')
        .in(
          'id',
          headshotIds
        );
  
      if (error) {
        console.error(
          'Unable to resolve editorial profile headshots:',
          error
        );
  
        throw new Error(
          `Unable to load editorial profile headshots: ${error.message}`
        );
      }
  
      for (
        const row of
          data ?? []
      ) {
        const asset =
          mapMediaAsset(
            row
          );
  
        headshots.set(
          asset.id,
          asset
        );
      }
    }
  
    return rows.map(
      (row) =>
        mapEditorialProfile(
          row,
          headshots
        )
    );
  }
  
  /* =========================================================
     SINGLE PROFILE
  ========================================================= */
  
  /**
   * Returns the editorial identity linked to an account.
   *
   * This does not determine whether the account currently has
   * Newsroom access. Authorization continues using isAuthor
   * and isEditor.
   */
  export async function getEditorialProfileByAccountId(
    accountId: string
  ): Promise<
    EditorialProfile | null
  > {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'editorial_profiles'
      )
      .select('*')
      .eq(
        'account_id',
        accountId
      )
      .maybeSingle();
  
    if (error) {
      console.error(
        'Unable to load editorial profile by account:',
        error
      );
  
      throw new Error(
        `Unable to load editorial profile: ${error.message}`
      );
    }
  
    if (!data) {
      return null;
    }
  
    const [
      profile,
    ] =
      await resolveEditorialProfiles(
        [
          data,
        ]
      );
  
    return (
      profile ??
      null
    );
  }
  
  /**
   * Returns a public contributor profile by its stable URL
   * slug. RLS determines whether hidden profiles are visible
   * to the current request.
   */
  export async function getEditorialProfileBySlug(
    slug: string
  ): Promise<
    EditorialProfile | null
  > {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'editorial_profiles'
      )
      .select('*')
      .eq(
        'slug',
        slug
      )
      .maybeSingle();
  
    if (error) {
      console.error(
        'Unable to load editorial profile by slug:',
        error
      );
  
      throw new Error(
        `Unable to load editorial profile: ${error.message}`
      );
    }
  
    if (!data) {
      return null;
    }
  
    const [
      profile,
    ] =
      await resolveEditorialProfiles(
        [
          data,
        ]
      );
  
    return (
      profile ??
      null
    );
  }
  
  /* =========================================================
     BATCH PROFILE RESOLUTION
  ========================================================= */
  
  /**
   * Resolves editorial identities for multiple account IDs in
   * one database query.
   *
   * The returned map is keyed by account ID so existing story
   * author_id and editor_id values can migrate incrementally
   * without producing N+1 database requests.
   */
  export async function getEditorialProfilesByAccountIds(
    accountIds: string[]
  ): Promise<
    Map<
      string,
      EditorialProfile
    >
  > {
    const uniqueAccountIds =
      Array.from(
        new Set(
          accountIds.filter(
            Boolean
          )
        )
      );
  
    if (
      uniqueAccountIds.length ===
      0
    ) {
      return new Map();
    }
  
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'editorial_profiles'
      )
      .select('*')
      .in(
        'account_id',
        uniqueAccountIds
      );
  
    if (error) {
      console.error(
        'Unable to load editorial profiles:',
        error
      );
  
      throw new Error(
        `Unable to load editorial profiles: ${error.message}`
      );
    }
  
    const profiles =
      await resolveEditorialProfiles(
        data ?? []
      );
  
    const profilesByAccountId =
      new Map<
        string,
        EditorialProfile
      >();
  
    for (
      const profile of
        profiles
    ) {
      if (
        profile.accountId
      ) {
        profilesByAccountId.set(
          profile.accountId,
          profile
        );
      }
    }
  
    return profilesByAccountId;
  }