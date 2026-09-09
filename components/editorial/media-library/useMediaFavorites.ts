'use client';

import {
  useCallback,
  useState,
} from 'react';

import type {
  MediaAsset,
} from '@/types/editorial';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface UseMediaFavoritesOptions {
  onUpdated?: (
    assetId: string,
    isFavorite: boolean
  ) => void;

  onError?: (
    message: string
  ) => void;
}

/* ========================================================= */
/* HOOK */
/* ========================================================= */

export function useMediaFavorites({
  onUpdated,
  onError,
}: UseMediaFavoritesOptions = {}) {
  const [
    loadingAssetId,
    setLoadingAssetId,
  ] = useState<
    string | null
  >(null);

  /* ======================================================= */
  /* TOGGLE */
  /* ======================================================= */

  const toggleFavorite =
    useCallback(
      async (
        asset: MediaAsset
      ) => {
        if (
          loadingAssetId
        ) {
          return;
        }

        setLoadingAssetId(
          asset.id
        );

        try {
          const response =
            await fetch(
              `/api/media/${asset.id}/favorite`,
              {
                method:
                  'PATCH',
              }
            );

          const result =
            await response
              .json()
              .catch(
                () =>
                  null
              );

          if (
            !response.ok
          ) {
            throw new Error(
              result?.error ??
                'Unable to update favorite.'
            );
          }

          const isFavorite =
            Boolean(
              result?.isFavorite
            );

          onUpdated?.(
            asset.id,
            isFavorite
          );

          return isFavorite;
        } catch (error) {
          const message =
            error instanceof
              Error
              ? error.message
              : 'Unable to update favorite.';

          onError?.(
            message
          );

          return null;
        } finally {
          setLoadingAssetId(
            null
          );
        }
      },
      [
        loadingAssetId,
        onError,
        onUpdated,
      ]
    );

  /* ======================================================= */
  /* ADD */
  /* ======================================================= */

  const addFavorite =
    useCallback(
      async (
        asset: MediaAsset
      ) => {
        setLoadingAssetId(
          asset.id
        );

        try {
          const response =
            await fetch(
              `/api/media/${asset.id}/favorite`,
              {
                method:
                  'POST',
              }
            );

          const result =
            await response
              .json()
              .catch(
                () =>
                  null
              );

          if (
            !response.ok
          ) {
            throw new Error(
              result?.error ??
                'Unable to favorite media asset.'
            );
          }

          onUpdated?.(
            asset.id,
            true
          );

          return true;
        } catch (error) {
          onError?.(
            error instanceof
              Error
              ? error.message
              : 'Unable to favorite media asset.'
          );

          return false;
        } finally {
          setLoadingAssetId(
            null
          );
        }
      },
      [
        onError,
        onUpdated,
      ]
    );

  /* ======================================================= */
  /* REMOVE */
  /* ======================================================= */

  const removeFavorite =
    useCallback(
      async (
        asset: MediaAsset
      ) => {
        setLoadingAssetId(
          asset.id
        );

        try {
          const response =
            await fetch(
              `/api/media/${asset.id}/favorite`,
              {
                method:
                  'DELETE',
              }
            );

          const result =
            await response
              .json()
              .catch(
                () =>
                  null
              );

          if (
            !response.ok
          ) {
            throw new Error(
              result?.error ??
                'Unable to remove favorite.'
            );
          }

          onUpdated?.(
            asset.id,
            false
          );

          return true;
        } catch (error) {
          onError?.(
            error instanceof
              Error
              ? error.message
              : 'Unable to remove favorite.'
          );

          return false;
        } finally {
          setLoadingAssetId(
            null
          );
        }
      },
      [
        onError,
        onUpdated,
      ]
    );

  return {
    loadingAssetId,

    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}