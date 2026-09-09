```ts
import {
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  getMediaAssets,
  type GetMediaAssetsOptions,
} from '@/lib/services/media';

import {
  getFavoriteMediaIds,
} from '@/lib/services/media-favorites';

import type {
  MediaAssetType,
  MediaRightsStatus,
  MediaStatus,
} from '@/types/editorial';

/* ========================================================= */
/* VALID VALUES */
/* ========================================================= */

const MEDIA_STATUSES: MediaStatus[] = [
  'draft',
  'approved',
  'restricted',
  'archived',
  'trashed',
];

const MEDIA_ASSET_TYPES: MediaAssetType[] = [
  'image',
  'graphic',
  'video',
  'audio',
  'document',
  'logo',
  'social',
  'broadcast',
  'other',
];

const MEDIA_RIGHTS_STATUSES: MediaRightsStatus[] = [
  'owned',
  'staff_created',
  'freelancer',
  'licensed',
  'wire_service',
  'government',
  'public_domain',
  'creative_commons',
  'reader_submitted',
  'restricted',
  'unknown',
];

const MEDIA_SORT_OPTIONS: NonNullable<
  GetMediaAssetsOptions['sort']
>[] = [
  'newest',
  'oldest',
  'updated',
  'filename_asc',
  'filename_desc',
  'largest',
  'smallest',
];

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function parsePositiveInteger(
  value: string | null,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(
  value: string | null
): boolean | undefined {
  if (
    value === null
  ) {
    return undefined;
  }

  if (
    value === '1' ||
    value === 'true'
  ) {
    return true;
  }

  if (
    value === '0' ||
    value === 'false'
  ) {
    return false;
  }

  return undefined;
}

function isMediaStatus(
  value: string | null
): value is MediaStatus {
  return (
    value !== null &&
    MEDIA_STATUSES.includes(
      value as MediaStatus
    )
  );
}

function isMediaAssetType(
  value: string | null
): value is MediaAssetType {
  return (
    value !== null &&
    MEDIA_ASSET_TYPES.includes(
      value as MediaAssetType
    )
  );
}

function isMediaRightsStatus(
  value: string | null
): value is MediaRightsStatus {
  return (
    value !== null &&
    MEDIA_RIGHTS_STATUSES.includes(
      value as MediaRightsStatus
    )
  );
}

function isMediaSort(
  value: string | null
): value is NonNullable<
  GetMediaAssetsOptions['sort']
> {
  return (
    value !== null &&
    MEDIA_SORT_OPTIONS.includes(
      value as NonNullable<
        GetMediaAssetsOptions['sort']
      >
    )
  );
}

/* ========================================================= */
/* GET */
/* ========================================================= */

export async function GET(
  request: Request
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !(
      user.profile
        ?.isAuthor ||
      user.profile
        ?.isEditor
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status:
          403,
      }
    );
  }

  const {
    searchParams,
  } = new URL(
    request.url
  );

  /* ======================================================= */
  /* QUERY PARAMS */
  /* ======================================================= */

  const search =
    searchParams
      .get(
        'search'
      )
      ?.trim() ||
    undefined;

  const page =
    parsePositiveInteger(
      searchParams.get(
        'page'
      ),
      1
    );

  const perPage =
    Math.min(
      100,
      parsePositiveInteger(
        searchParams.get(
          'perPage'
        ),
        24
      )
    );

  const statusParam =
    searchParams.get(
      'status'
    );

  const assetTypeParam =
    searchParams.get(
      'type'
    );

  const rightsStatusParam =
    searchParams.get(
      'rights'
    );

  const sortParam =
    searchParams.get(
      'sort'
    );

  const favoriteOnly =
    parseBoolean(
      searchParams.get(
        'favorite'
      )
    );

  const island =
    searchParams
      .get(
        'island'
      )
      ?.trim() ||
    undefined;

  const categoryId =
    searchParams
      .get(
        'categoryId'
      )
      ?.trim() ||
    undefined;

  const uploadedBy =
    searchParams
      .get(
        'uploadedBy'
      )
      ?.trim() ||
    undefined;

  const photographer =
    searchParams
      .get(
        'photographer'
      )
      ?.trim() ||
    undefined;

  const sourceName =
    searchParams
      .get(
        'source'
      )
      ?.trim() ||
    undefined;

  /* ======================================================= */
  /* FAVORITES */
  /* ======================================================= */

  let favoriteMediaIds:
    string[] = [];

  try {
    favoriteMediaIds =
      await getFavoriteMediaIds(
        user.id
      );
  } catch (error) {
    console.error(
      'Unable to load media favorite IDs:',
      error
    );

    /*
     * The Media Library should still be able to load
     * even if favorite lookup fails.
     */
    favoriteMediaIds =
      [];
  }

  /* ======================================================= */
  /* OPTIONS */
  /* ======================================================= */

  const options: GetMediaAssetsOptions = {
    search,

    page,

    perPage,

    island,

    categoryId,

    uploadedBy,

    photographer,

    sourceName,

    favoriteMediaIds,

    favoriteOnly,
  };

  if (
    isMediaStatus(
      statusParam
    )
  ) {
    options.status =
      statusParam;
  }

  if (
    isMediaAssetType(
      assetTypeParam
    )
  ) {
    options.assetType =
      assetTypeParam;
  }

  if (
    isMediaRightsStatus(
      rightsStatusParam
    )
  ) {
    options.rightsStatus =
      rightsStatusParam;
  }

  if (
    isMediaSort(
      sortParam
    )
  ) {
    options.sort =
      sortParam;
  }

  /* ======================================================= */
  /* FETCH */
  /* ======================================================= */

  try {
    const result =
      await getMediaAssets(
        options
      );

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      'Media API list error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to load media library',
      },
      {
        status:
          500,
      }
    );
  }
}
```
