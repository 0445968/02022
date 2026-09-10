import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  /* ========================================================= */
  /* TYPES */
  /* ========================================================= */
  
  export interface MediaFavoriteResult {
    mediaAssetId: string;
  
    isFavorite: boolean;
  }
  
  /* ========================================================= */
  /* CHECK FAVORITE */
   /* ======================================================== */
  
  export async function isMediaFavorite(
    mediaAssetId: string,
    userId: string
  ): Promise<boolean> {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'media_favorites'
      )
      .select(
        'id'
      )
      .eq(
        'media_asset_id',
        mediaAssetId
      )
      .eq(
        'user_id',
        userId
      )
      .maybeSingle();
  
    if (error) {
      console.error(
        'Failed to check media favorite:',
        error
      );
  
      return false;
    }
  
    return Boolean(
      data
    );
  }
  
  /* ========================================================= */
  /* ADD FAVORITE */
  /* ========================================================= */
  
  export async function favoriteMediaAsset(
    mediaAssetId: string,
    userId: string
  ): Promise<boolean> {
    const supabase =
      await getDataClient();
  
    /*
     * Check first so repeated clicks remain
     * idempotent even if the database does not
     * yet have a unique constraint.
     */
    const alreadyFavorite =
      await isMediaFavorite(
        mediaAssetId,
        userId
      );
  
    if (
      alreadyFavorite
    ) {
      return true;
    }
  
    const {
      error,
    } = await supabase
      .from(
        'media_favorites'
      )
      .insert({
        media_asset_id:
          mediaAssetId,
  
        user_id:
          userId,
      });
  
    if (error) {
      console.error(
        'Failed to favorite media asset:',
        error
      );
  
      return false;
    }
  
    return true;
  }
  
  /* ========================================================= */
  /* REMOVE FAVORITE */
  /* ========================================================= */
  
  export async function unfavoriteMediaAsset(
    mediaAssetId: string,
    userId: string
  ): Promise<boolean> {
    const supabase =
      await getDataClient();
  
    const {
      error,
    } = await supabase
      .from(
        'media_favorites'
      )
      .delete()
      .eq(
        'media_asset_id',
        mediaAssetId
      )
      .eq(
        'user_id',
        userId
      );
  
    if (error) {
      console.error(
        'Failed to remove media favorite:',
        error
      );
  
      return false;
    }
  
    return true;
  }
  
  /* ========================================================= */
  /* TOGGLE FAVORITE */
  /* ========================================================= */
  
  export async function toggleMediaFavorite(
    mediaAssetId: string,
    userId: string
  ): Promise<MediaFavoriteResult | null> {
    const currentlyFavorite =
      await isMediaFavorite(
        mediaAssetId,
        userId
      );
  
    if (
      currentlyFavorite
    ) {
      const success =
        await unfavoriteMediaAsset(
          mediaAssetId,
          userId
        );
  
      if (
        !success
      ) {
        return null;
      }
  
      return {
        mediaAssetId,
  
        isFavorite:
          false,
      };
    }
  
    const success =
      await favoriteMediaAsset(
        mediaAssetId,
        userId
      );
  
    if (
      !success
    ) {
      return null;
    }
  
    return {
      mediaAssetId,
  
      isFavorite:
        true,
    };
  }
  
  /* ========================================================= */
  /* GET FAVORITE IDS */
   /* ======================================================== */
  
  export async function getFavoriteMediaIds(
    userId: string
  ): Promise<string[]> {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'media_favorites'
      )
      .select(
        'media_asset_id'
      )
      .eq(
        'user_id',
        userId
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      );
  
    if (error) {
      console.error(
        'Failed to load media favorites:',
        error
      );
  
      return [];
    }
  
    return (
      data ?? []
    ).map(
      (
        item
      ) =>
        item.media_asset_id
    );
  }
