import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { getDataClient } from '@/lib/db/supabase-data-access';

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  createMediaAssetRecord,
} from '@/lib/services/media';

import type {
  IslandScope,
  MediaAssetType,
  MediaRightsStatus,
} from '@/types/editorial';

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function sanitizeBaseName(
  value: string
): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function getExtension(
  fileName: string,
  mimeType: string
): string {
  const fromFileName =
    fileName
      .split('.')
      .pop()
      ?.toLowerCase();

  if (
    fromFileName &&
    fromFileName !== fileName.toLowerCase()
  ) {
    return sanitizeBaseName(
      fromFileName
    );
  }

  const mimeExtensions: Record<
    string,
    string
  > = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',

    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',

    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',

    'application/pdf': 'pdf',
  };

  return (
    mimeExtensions[
      mimeType
    ] ?? 'bin'
  );
}

function getBaseName(
  fileName: string
): string {
  const lastDot =
    fileName.lastIndexOf('.');

  const rawBase =
    lastDot > 0
      ? fileName.slice(
          0,
          lastDot
        )
      : fileName;

  const sanitized =
    sanitizeBaseName(
      rawBase
    );

  return (
    sanitized ||
    'media'
  );
}

function detectAssetType(
  mimeType: string,
  fileName: string
): MediaAssetType {
  const extension =
    getExtension(
      fileName,
      mimeType
    );

  if (
    mimeType.startsWith(
      'image/'
    )
  ) {
    if (
      extension === 'svg'
    ) {
      return 'graphic';
    }

    return 'image';
  }

  if (
    mimeType.startsWith(
      'video/'
    )
  ) {
    return 'video';
  }

  if (
    mimeType.startsWith(
      'audio/'
    )
  ) {
    return 'audio';
  }

  if (
    mimeType ===
    'application/pdf'
  ) {
    return 'document';
  }

  return 'other';
}

function getOptionalString(
  formData: FormData,
  key: string
): string | null {
  const value =
    formData.get(
      key
    );

  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function getOptionalNumber(
  formData: FormData,
  key: string
): number | null {
  const value =
    formData.get(
      key
    );

  if (
    typeof value !==
      'string' ||
    !value.trim()
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function getBoolean(
  formData: FormData,
  key: string,
  fallback: boolean
): boolean {
  const value =
    formData.get(
      key
    );

  if (
    value === 'true' ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === 'false' ||
    value === '0'
  ) {
    return false;
  }

  return fallback;
}

function getStringArray(
  formData: FormData,
  key: string
): string[] {
  const values =
    formData.getAll(
      key
    );

  return values
    .filter(
      (
        item
      ): item is string =>
        typeof item ===
        'string'
    )
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function isRightsStatus(
  value:
    | string
    | null
): value is MediaRightsStatus {
  return [
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
  ].includes(
    value ?? ''
  );
}

function buildStoragePath(
  file: File
): string {
  const base =
    getBaseName(
      file.name
    );

  const extension =
    getExtension(
      file.name,
      file.type
    );

  const timestamp =
    Date.now();

  const random =
    Math.random()
      .toString(36)
      .slice(
        2,
        10
      );

  const now =
    new Date();

  const year =
    String(
      now.getUTCFullYear()
    );

  const month =
    String(
      now.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    );

  return [
    'uploads',
    year,
    month,
    `${timestamp}-${random}-${base}.${extension}`,
  ].join('/');
}

/* ========================================================= */
/* POST */
/* ========================================================= */

export async function POST(
  request: Request
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

  let formData:
    FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid upload request',
      },
      {
        status: 400,
      }
    );
  }

  const fileValue =
    formData.get(
      'file'
    );

  if (
    !(fileValue instanceof File)
  ) {
    return NextResponse.json(
      {
        error:
          'No file provided',
      },
      {
        status: 400,
      }
    );
  }

  const file =
    fileValue;

  /* ------------------------------------------------------- */
  /* FILE VALIDATION */
  /* ------------------------------------------------------- */

  if (
    file.size <= 0
  ) {
    return NextResponse.json(
      {
        error:
          'The uploaded file is empty',
      },
      {
        status: 400,
      }
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as typeof ALLOWED_MIME_TYPES[number]
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid file type',
        mimeType:
          file.type,
      },
      {
        status: 400,
      }
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return NextResponse.json(
      {
        error:
          'File too large',
        maximumBytes:
          MAX_FILE_SIZE,
      },
      {
        status: 400,
      }
    );
  }

  /* ------------------------------------------------------- */
  /* BASIC METADATA */
  /* ------------------------------------------------------- */

  const width =
    getOptionalNumber(
      formData,
      'width'
    );

  const height =
    getOptionalNumber(
      formData,
      'height'
    );

  const altText =
    getOptionalString(
      formData,
      'altText'
    ) ?? '';

  const title =
    getOptionalString(
      formData,
      'title'
    );

  const caption =
    getOptionalString(
      formData,
      'caption'
    );

  const description =
    getOptionalString(
      formData,
      'description'
    );

  const credit =
    getOptionalString(
      formData,
      'credit'
    );

  const photographer =
    getOptionalString(
      formData,
      'photographer'
    );

  const creatorName =
    getOptionalString(
      formData,
      'creatorName'
    );

  const copyrightHolder =
    getOptionalString(
      formData,
      'copyrightHolder'
    );

  const sourceName =
    getOptionalString(
      formData,
      'sourceName'
    );

  const sourceUrl =
    getOptionalString(
      formData,
      'sourceUrl'
    );

  const requestedRights =
    getOptionalString(
      formData,
      'rightsStatus'
    );

  const rightsStatus:
    MediaRightsStatus =
    isRightsStatus(
      requestedRights
    )
      ? requestedRights
      : 'unknown';

  const licenseName =
    getOptionalString(
      formData,
      'licenseName'
    );

  const rightsNotes =
    getOptionalString(
      formData,
      'rightsNotes'
    );

  const allowedUses =
    getStringArray(
      formData,
      'allowedUses'
    );

  const restrictions =
    getStringArray(
      formData,
      'restrictions'
    );

  const dateCreated =
    getOptionalString(
      formData,
      'dateCreated'
    );

  const approximateDate =
    getOptionalString(
      formData,
      'approximateDate'
    );

  const island =
    getOptionalString(
      formData,
      'island'
    );

  const country =
    getOptionalString(
      formData,
      'country'
    );

  const region =
    getOptionalString(
      formData,
      'region'
    );

  const city =
    getOptionalString(
      formData,
      'city'
    );

  const neighborhood =
    getOptionalString(
      formData,
      'neighborhood'
    );

  const locationName =
    getOptionalString(
      formData,
      'locationName'
    );

  const latitude =
    getOptionalNumber(
      formData,
      'latitude'
    );

  const longitude =
    getOptionalNumber(
      formData,
      'longitude'
    );

  const language =
    getOptionalString(
      formData,
      'language'
    );

  const categoryId =
    getOptionalString(
      formData,
      'categoryId'
    );

  const internalNotes =
    getOptionalString(
      formData,
      'internalNotes'
    );

  const decorative =
    getBoolean(
      formData,
      'decorative',
      false
    );

  const displayCaption =
    getBoolean(
      formData,
      'displayCaption',
      true
    );

  const displayCredit =
    getBoolean(
      formData,
      'displayCredit',
      true
    );

  /* ------------------------------------------------------- */
  /* STORAGE */
  /* ------------------------------------------------------- */

  const supabase =
    await getDataClient();

  const storagePath =
    buildStoragePath(
      file
    );

  const {
    error: uploadError,
  } = await supabase.storage
    .from('media')
    .upload(
      storagePath,
      file,
      {
        contentType:
          file.type,

        cacheControl:
          '3600',

        upsert:
          false,
      }
    );

  if (uploadError) {
    console.error(
      'Media storage upload failed:',
      uploadError
    );

    return NextResponse.json(
      {
        error:
          'Upload failed',
      },
      {
        status: 500,
      }
    );
  }

  /* ------------------------------------------------------- */
  /* PUBLIC URL */
  /* ------------------------------------------------------- */

  const {
    data: urlData,
  } = supabase.storage
    .from('media')
    .getPublicUrl(
      storagePath
    );

  if (
    !urlData?.publicUrl
  ) {
    await supabase.storage
      .from('media')
      .remove([
        storagePath,
      ]);

    return NextResponse.json(
      {
        error:
          'Unable to create media URL',
      },
      {
        status: 500,
      }
    );
  }

  /* ------------------------------------------------------- */
  /* DATABASE RECORD */
  /* ------------------------------------------------------- */

  const assetType =
    detectAssetType(
      file.type,
      file.name
    );

  const media =
    await createMediaAssetRecord(
      {
        url:
          urlData.publicUrl,

        storagePath,

        /*
         * fileName remains the human-readable original filename.
         *
         * The actual unique Storage filename is represented by
         * storagePath.
         */
        fileName:
          file.name,

        originalFileName:
          file.name,

        mimeType:
          file.type,

        assetType,

        width,

        height,

        fileSize:
          file.size,

        title,

        altText,

        caption,

        description,

        credit,

        photographer,

        creatorName,

        copyrightHolder,

        sourceName,

        sourceUrl,

        rightsStatus,

        licenseName,

        rightsNotes,

        allowedUses,

        restrictions,

        dateCreated,

        approximateDate,

        island:
  island as
    | IslandScope
    | null,

        country,

        region,

        city,

        neighborhood,

        locationName,

        latitude,

        longitude,

        language,

        categoryId,

        displayCaption,

        displayCredit,

        decorative,

        internalNotes,

        uploadedBy:
          user.id,
      }
    );

  /* ------------------------------------------------------- */
  /* ROLLBACK STORAGE IF DATABASE INSERT FAILS */
  /* ------------------------------------------------------- */

  if (!media) {
    const {
      error:
        cleanupError,
    } =
      await supabase.storage
        .from('media')
        .remove([
          storagePath,
        ]);

    if (cleanupError) {
      console.error(
        'Failed to clean up orphaned media upload:',
        cleanupError
      );
    }

    return NextResponse.json(
      {
        error:
          'Failed to create media record',
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      item:
        media,
    },
    {
      status: 201,
    }
  );
}