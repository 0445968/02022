import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

import {
  approveMediaAsset,
  archiveMediaAsset,
  deleteMediaAsset,
  getMediaAsset,
  restoreMediaAsset,
  trashMediaAsset,
  updateMediaAsset,
  type MediaAssetUpdate,
} from '@/lib/services/media';

import type {
  MediaAssetType,
  MediaRightsStatus,
  MediaSensitiveLevel,
  MediaStatus,
} from '@/types/editorial';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

type MediaAction =
  | 'approve'
  | 'archive'
  | 'trash'
  | 'restore';

interface MediaPatchBody
  extends MediaAssetUpdate {
  action?: MediaAction;
}

/* ========================================================= */
/* VALID VALUES */
/* ========================================================= */

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

const MEDIA_STATUSES: MediaStatus[] = [
  'draft',
  'approved',
  'restricted',
  'archived',
  'trashed',
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

const MEDIA_SENSITIVE_LEVELS: MediaSensitiveLevel[] = [
  'none',
  'sensitive',
  'disturbing',
  'graphic',
];

const MEDIA_ACTIONS: MediaAction[] = [
  'approve',
  'archive',
  'trash',
  'restore',
];

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function isMediaAction(
  value: unknown
): value is MediaAction {
  return (
    typeof value === 'string' &&
    MEDIA_ACTIONS.includes(
      value as MediaAction
    )
  );
}

function isMediaAssetType(
  value: unknown
): value is MediaAssetType {
  return (
    typeof value === 'string' &&
    MEDIA_ASSET_TYPES.includes(
      value as MediaAssetType
    )
  );
}

function isMediaStatus(
  value: unknown
): value is MediaStatus {
  return (
    typeof value === 'string' &&
    MEDIA_STATUSES.includes(
      value as MediaStatus
    )
  );
}

function isMediaRightsStatus(
  value: unknown
): value is MediaRightsStatus {
  return (
    typeof value === 'string' &&
    MEDIA_RIGHTS_STATUSES.includes(
      value as MediaRightsStatus
    )
  );
}

function isSensitiveLevel(
  value: unknown
): value is MediaSensitiveLevel {
  return (
    typeof value === 'string' &&
    MEDIA_SENSITIVE_LEVELS.includes(
      value as MediaSensitiveLevel
    )
  );
}

function stringOrNull(
  value: unknown
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed =
    value.trim();

  return trimmed === ''
    ? null
    : trimmed;
}

function booleanOrUndefined(
  value: unknown
): boolean | undefined {
  return typeof value === 'boolean'
    ? value
    : undefined;
}

function numberOrNull(
  value: unknown
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : undefined;
  }

  if (typeof value === 'string') {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  return undefined;
}

function stringArrayOrUndefined(
  value: unknown
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === 'string'
    )
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function dateStringOrNull(
  value: unknown
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value !== 'string'
  ) {
    return undefined;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return undefined;
  }

  return parsed.toISOString();
}

/**
 * Explicitly whitelist fields accepted from the client.
 *
 * Never pass the entire request body directly to the database
 * service because this endpoint controls newsroom asset metadata.
 */
function buildMediaUpdate(
  body: Record<string, unknown>,
  userId: string
): MediaAssetUpdate {
  const update: MediaAssetUpdate = {
    lastEditedBy:
      userId,
  };

  if ('title' in body) {
    update.title =
      stringOrNull(
        body.title
      );
  }

  if ('altText' in body) {
    update.altText =
      typeof body.altText === 'string'
        ? body.altText.trim()
        : '';
  }

  if ('caption' in body) {
    update.caption =
      stringOrNull(
        body.caption
      );
  }

  if ('description' in body) {
    update.description =
      stringOrNull(
        body.description
      );
  }

  if ('credit' in body) {
    update.credit =
      stringOrNull(
        body.credit
      );
  }

  if ('photographer' in body) {
    update.photographer =
      stringOrNull(
        body.photographer
      );
  }

  if ('creatorName' in body) {
    update.creatorName =
      stringOrNull(
        body.creatorName
      );
  }

  if ('copyrightHolder' in body) {
    update.copyrightHolder =
      stringOrNull(
        body.copyrightHolder
      );
  }

  if ('sourceName' in body) {
    update.sourceName =
      stringOrNull(
        body.sourceName
      );
  }

  if ('sourceUrl' in body) {
    update.sourceUrl =
      stringOrNull(
        body.sourceUrl
      );
  }

  if (
    'assetType' in body &&
    isMediaAssetType(
      body.assetType
    )
  ) {
    update.assetType =
      body.assetType;
  }

  if (
    'status' in body &&
    isMediaStatus(
      body.status
    )
  ) {
    update.status =
      body.status;
  }

  if (
    'rightsStatus' in body &&
    isMediaRightsStatus(
      body.rightsStatus
    )
  ) {
    update.rightsStatus =
      body.rightsStatus;
  }

  if ('licenseName' in body) {
    update.licenseName =
      stringOrNull(
        body.licenseName
      );
  }

  if ('rightsNotes' in body) {
    update.rightsNotes =
      stringOrNull(
        body.rightsNotes
      );
  }

  if ('allowedUses' in body) {
    const allowedUses =
      stringArrayOrUndefined(
        body.allowedUses
      );

    if (allowedUses) {
      update.allowedUses =
        allowedUses;
    }
  }

  if ('restrictions' in body) {
    const restrictions =
      stringArrayOrUndefined(
        body.restrictions
      );

    if (restrictions) {
      update.restrictions =
        restrictions;
    }
  }

  if (
    'licenseExpiresAt' in body
  ) {
    update.licenseExpiresAt =
      dateStringOrNull(
        body.licenseExpiresAt
      );
  }

  if ('embargoUntil' in body) {
    update.embargoUntil =
      dateStringOrNull(
        body.embargoUntil
      );
  }

  if ('dateCreated' in body) {
    update.dateCreated =
      dateStringOrNull(
        body.dateCreated
      );
  }

  if ('approximateDate' in body) {
    update.approximateDate =
      stringOrNull(
        body.approximateDate
      );
  }

  if ('island' in body) {
    const island =
      stringOrNull(
        body.island
      );

    update.island =
      island as MediaAssetUpdate['island'];
  }

  if ('country' in body) {
    update.country =
      stringOrNull(
        body.country
      );
  }

  if ('region' in body) {
    update.region =
      stringOrNull(
        body.region
      );
  }

  if ('city' in body) {
    update.city =
      stringOrNull(
        body.city
      );
  }

  if ('neighborhood' in body) {
    update.neighborhood =
      stringOrNull(
        body.neighborhood
      );
  }

  if ('locationName' in body) {
    update.locationName =
      stringOrNull(
        body.locationName
      );
  }

  if ('latitude' in body) {
    update.latitude =
      numberOrNull(
        body.latitude
      );
  }

  if ('longitude' in body) {
    update.longitude =
      numberOrNull(
        body.longitude
      );
  }

  if ('language' in body) {
    update.language =
      stringOrNull(
        body.language
      );
  }

  if ('categoryId' in body) {
    update.categoryId =
      stringOrNull(
        body.categoryId
      );
  }

  if ('focalPointX' in body) {
    const focalPointX =
      numberOrNull(
        body.focalPointX
      );

    if (
      focalPointX === null ||
      (
        focalPointX !== undefined &&
        focalPointX >= 0 &&
        focalPointX <= 1
      )
    ) {
      update.focalPointX =
        focalPointX;
    }
  }

  if ('focalPointY' in body) {
    const focalPointY =
      numberOrNull(
        body.focalPointY
      );

    if (
      focalPointY === null ||
      (
        focalPointY !== undefined &&
        focalPointY >= 0 &&
        focalPointY <= 1
      )
    ) {
      update.focalPointY =
        focalPointY;
    }
  }

  if ('displayCaption' in body) {
    const value =
      booleanOrUndefined(
        body.displayCaption
      );

    if (value !== undefined) {
      update.displayCaption =
        value;
    }
  }

  if ('displayCredit' in body) {
    const value =
      booleanOrUndefined(
        body.displayCredit
      );

    if (value !== undefined) {
      update.displayCredit =
        value;
    }
  }

  if ('decorative' in body) {
    const value =
      booleanOrUndefined(
        body.decorative
      );

    if (value !== undefined) {
      update.decorative =
        value;
    }
  }

  if (
    'sensitiveLevel' in body &&
    isSensitiveLevel(
      body.sensitiveLevel
    )
  ) {
    update.sensitiveLevel =
      body.sensitiveLevel;
  }

  if ('internalNotes' in body) {
    update.internalNotes =
      stringOrNull(
        body.internalNotes
      );
  }

  if ('isSuperseded' in body) {
    const value =
      booleanOrUndefined(
        body.isSuperseded
      );

    if (value !== undefined) {
      update.isSuperseded =
        value;
    }
  }

  if ('supersededBy' in body) {
    update.supersededBy =
      stringOrNull(
        body.supersededBy
      );
  }

  return update;
}

/* ========================================================= */
/* GET SINGLE MEDIA ASSET */
/* ========================================================= */

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !(
      user.profile?.isAuthor ||
      user.profile?.isEditor
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status: 403,
      }
    );
  }

  const asset =
    await getMediaAsset(
      params.id
    );

  if (!asset) {
    return NextResponse.json(
      {
        error:
          'Media asset not found',
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(
    asset
  );
}

/* ========================================================= */
/* PATCH */
/* ========================================================= */

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !(
      user.profile?.isAuthor ||
      user.profile?.isEditor
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status: 403,
      }
    );
  }

  const existing =
    await getMediaAsset(
      params.id
    );

  if (!existing) {
    return NextResponse.json(
      {
        error:
          'Media asset not found',
      },
      {
        status: 404,
      }
    );
  }

  let rawBody:
    Record<string, unknown>;

  try {
    rawBody =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid JSON',
      },
      {
        status: 400,
      }
    );
  }

  /* ------------------------------------------------------- */
  /* WORKFLOW ACTION */
  /* ------------------------------------------------------- */

  if (
    'action' in rawBody
  ) {
    if (
      !isMediaAction(
        rawBody.action
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid media action',
        },
        {
          status: 400,
        }
      );
    }

    const action =
      rawBody.action;

    /*
     * Approval is editor-only.
     */
    if (
      action === 'approve' &&
      !user.profile?.isEditor
    ) {
      return NextResponse.json(
        {
          error:
            'Only editors can approve media',
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Archive, trash, and restore are also editor-only.
     *
     * Authors can edit media metadata but cannot remove
     * shared newsroom assets from active circulation.
     */
    if (
      (
        action === 'archive' ||
        action === 'trash' ||
        action === 'restore'
      ) &&
      !user.profile?.isEditor
    ) {
      return NextResponse.json(
        {
          error:
            'Only editors can change media archive status',
        },
        {
          status: 403,
        }
      );
    }

    let success = false;

    switch (action) {
      case 'approve':
        success =
          await approveMediaAsset(
            params.id,
            user.id
          );
        break;

      case 'archive':
        success =
          await archiveMediaAsset(
            params.id,
            user.id
          );
        break;

      case 'trash':
        success =
          await trashMediaAsset(
            params.id,
            user.id
          );
        break;

      case 'restore':
        success =
          await restoreMediaAsset(
            params.id,
            user.id
          );
        break;
    }

    if (!success) {
      return NextResponse.json(
        {
          error:
            'Failed to update media status',
        },
        {
          status: 500,
        }
      );
    }

    const updated =
      await getMediaAsset(
        params.id
      );

    return NextResponse.json(
      {
        success: true,
        item:
          updated,
      }
    );
  }

  /* ------------------------------------------------------- */
  /* METADATA UPDATE */
  /* ------------------------------------------------------- */

  /*
   * Do not allow authors to manually bypass workflow by
   * sending status fields directly.
   */
  if (
    !user.profile?.isEditor
  ) {
    delete rawBody.status;
    delete rawBody.approvedBy;
    delete rawBody.approvedAt;
    delete rawBody.archivedAt;
    delete rawBody.trashedAt;
  }

  const update =
    buildMediaUpdate(
      rawBody,
      user.id
    );

  const success =
    await updateMediaAsset(
      params.id,
      update
    );

  if (!success) {
    return NextResponse.json(
      {
        error:
          'Failed to update media asset',
      },
      {
        status: 500,
      }
    );
  }

  const updated =
    await getMediaAsset(
      params.id
    );

  return NextResponse.json(
    {
      success: true,
      item:
        updated,
    }
  );
}

/* ========================================================= */
/* DELETE — PERMANENT DELETE ONLY */
/* ========================================================= */

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !user.profile?.isEditor
  ) {
    return NextResponse.json(
      {
        error:
          'Only editors can permanently delete media',
      },
      {
        status: 403,
      }
    );
  }

  const {
    searchParams,
  } = new URL(
    request.url
  );

  const permanent =
    searchParams.get(
      'permanent'
    );

  /*
   * Normal deletion should use:
   *
   * PATCH { action: "trash" }
   *
   * DELETE exists only for explicit permanent destruction.
   */
  if (
    permanent !== 'true'
  ) {
    return NextResponse.json(
      {
        error:
          'Permanent deletion requires ?permanent=true. Move the asset to Trash first.',
      },
      {
        status: 400,
      }
    );
  }

  const asset =
    await getMediaAsset(
      params.id
    );

  if (!asset) {
    return NextResponse.json(
      {
        error:
          'Media asset not found',
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Nothing can be permanently deleted directly from
   * Draft / Approved / Restricted / Archive.
   */
  if (
    asset.status !== 'trashed'
  ) {
    return NextResponse.json(
      {
        error:
          'Media must be moved to Trash before permanent deletion.',
      },
      {
        status: 409,
      }
    );
  }

  /*
   * Later, media_usage will be checked here as well.
   *
   * Once usage tracking is connected, assets referenced
   * by published content will be blocked from permanent
   * deletion even when they are in Trash.
   */

  const success =
    await deleteMediaAsset(
      asset.id,
      asset.storagePath
    );

  if (!success) {
    return NextResponse.json(
      {
        error:
          'Failed to permanently delete media asset',
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
    }
  );
}