import { getDataClient } from '@/lib/db/supabase-data-access';
import type { Database, IslandScope } from '@/lib/db/database.types';

import type {
  MediaAsset,
  MediaAssetType,
  MediaRightsStatus,
  MediaSensitiveLevel,
  MediaStatus,
} from '@/types/editorial';

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/services/media-config';

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};

/* ========================================================= */
/* TYPES */
/* ========================================================= */

export interface MediaAssetUpdate {
  title?: string | null;

  altText?: string;

  caption?: string | null;

  description?: string | null;

  credit?: string | null;

  photographer?: string | null;

  creatorName?: string | null;

  copyrightHolder?: string | null;

  sourceName?: string | null;

  sourceUrl?: string | null;

  assetType?: MediaAssetType;

  status?: MediaStatus;

  rightsStatus?: MediaRightsStatus;

  licenseName?: string | null;

  rightsNotes?: string | null;

  allowedUses?: string[];

  restrictions?: string[];

  licenseExpiresAt?: string | null;

  embargoUntil?: string | null;

  dateCreated?: string | null;

  approximateDate?: string | null;

  island?: MediaAsset['island'];

  country?: string | null;

  region?: string | null;

  city?: string | null;

  neighborhood?: string | null;

  locationName?: string | null;

  latitude?: number | null;

  longitude?: number | null;

  language?: string | null;

  categoryId?: string | null;

  focalPointX?: number | null;

  focalPointY?: number | null;

  displayCaption?: boolean;

  displayCredit?: boolean;

  decorative?: boolean;

  sensitiveLevel?: MediaSensitiveLevel;

  internalNotes?: string | null;

  isSuperseded?: boolean;

  supersededBy?: string | null;

  approvedBy?: string | null;

  approvedAt?: string | null;

  archivedAt?: string | null;

  trashedAt?: string | null;

  lastEditedBy?: string | null;
}

export interface CreateMediaAssetInput {
  url: string;

  storagePath: string;

  fileName: string;

  originalFileName?: string | null;

  mimeType: string;

  assetType?: MediaAssetType;

  width?: number | null;

  height?: number | null;

  fileSize?: number | null;

  checksum?: string | null;

  title?: string | null;

  altText?: string;

  caption?: string | null;

  description?: string | null;

  credit?: string | null;

  photographer?: string | null;

  creatorName?: string | null;

  copyrightHolder?: string | null;

  sourceName?: string | null;

  sourceUrl?: string | null;

  rightsStatus?: MediaRightsStatus;

  licenseName?: string | null;

  rightsNotes?: string | null;

  allowedUses?: string[];

  restrictions?: string[];

  licenseExpiresAt?: string | null;

  embargoUntil?: string | null;

  dateCreated?: string | null;

  approximateDate?: string | null;

  island?: MediaAsset['island'];

  country?: string | null;

  region?: string | null;

  city?: string | null;

  neighborhood?: string | null;

  locationName?: string | null;

  latitude?: number | null;

  longitude?: number | null;

  language?: string | null;

  categoryId?: string | null;

  focalPointX?: number | null;

  focalPointY?: number | null;

  displayCaption?: boolean;

  displayCredit?: boolean;

  decorative?: boolean;

  sensitiveLevel?: MediaSensitiveLevel;

  internalNotes?: string | null;

  uploadedBy: string;
}

export interface GetMediaAssetsOptions {
  search?: string;

  page?: number;

  perPage?: number;

  status?: MediaStatus;

  assetType?: MediaAssetType;

  rightsStatus?: MediaRightsStatus;

  island?: string;

  categoryId?: string;

  uploadedBy?: string;

  photographer?: string;

  sourceName?: string;

  favoriteMediaIds?: string[];

  favoriteOnly?: boolean;

  sort?:
    | 'newest'
    | 'oldest'
    | 'updated'
    | 'filename_asc'
    | 'filename_desc'
    | 'largest'
    | 'smallest';
}

export interface MediaAssetListResult {
  items: MediaAsset[];

  total: number;

  page: number;

  perPage: number;

  totalPages: number;
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function stringOrNull(
  value: unknown
): string | null {
  return typeof value === 'string'
    ? value
    : null;
}

function numberOrNull(
  value: unknown
): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim() !== ''
  ) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function booleanOrDefault(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === 'boolean'
    ? value
    : fallback;
}

function stringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === 'string'
  );
}

/**
 * Supabase's .or() syntax uses commas to separate conditions.
 *
 * Strip characters that can interfere with the PostgREST filter
 * expression before building the multi-column search.
 */
function sanitizeSearchTerm(
  value: string
): string {
  return value
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ');
}

/* ========================================================= */
/* ROW MAPPER */
/* ========================================================= */

export function mapMediaRow(
  row: Record<string, unknown>,
  favoriteMediaIds?: Set<string>
): MediaAsset {
  return {
    id: row.id as string,

    /* FILE */

    url: row.url as string,

    storagePath:
      row.storage_path as string,

    fileName:
      row.file_name as string,

    originalFileName:
      stringOrNull(
        row.original_file_name
      ),

    mimeType:
      row.mime_type as string,

    assetType:
      (
        row.asset_type ??
        'image'
      ) as MediaAssetType,

    width:
      numberOrNull(
        row.width
      ),

    height:
      numberOrNull(
        row.height
      ),

    fileSize:
      numberOrNull(
        row.file_size
      ),

    checksum:
      stringOrNull(
        row.checksum
      ),

    /* CORE EDITORIAL METADATA */

    title:
      stringOrNull(
        row.title
      ),

    altText:
      typeof row.alt_text === 'string'
        ? row.alt_text
        : '',

    caption:
      stringOrNull(
        row.caption
      ),

    description:
      stringOrNull(
        row.description
      ),

    credit:
      stringOrNull(
        row.credit
      ),

    photographer:
      stringOrNull(
        row.photographer
      ),

    creatorName:
      stringOrNull(
        row.creator_name
      ),

    copyrightHolder:
      stringOrNull(
        row.copyright_holder
      ),

    sourceName:
      stringOrNull(
        row.source_name
      ),

    sourceUrl:
      stringOrNull(
        row.source_url
      ),

    /* WORKFLOW */

    status:
      (
        row.status ??
        'draft'
      ) as MediaStatus,

    approvedBy:
      stringOrNull(
        row.approved_by
      ),

    approvedAt:
      stringOrNull(
        row.approved_at
      ),

    archivedAt:
      stringOrNull(
        row.archived_at
      ),

    trashedAt:
      stringOrNull(
        row.trashed_at
      ),

    /* RIGHTS */

    rightsStatus:
      (
        row.rights_status ??
        'unknown'
      ) as MediaRightsStatus,

    licenseName:
      stringOrNull(
        row.license_name
      ),

    rightsNotes:
      stringOrNull(
        row.rights_notes
      ),

    allowedUses:
      stringArray(
        row.allowed_uses
      ),

    restrictions:
      stringArray(
        row.restrictions
      ),

    licenseExpiresAt:
      stringOrNull(
        row.license_expires_at
      ),

    embargoUntil:
      stringOrNull(
        row.embargo_until
      ),

    /* DATE / ARCHIVE */

    dateCreated:
      stringOrNull(
        row.date_created
      ),

    approximateDate:
      stringOrNull(
        row.approximate_date
      ),

    /* LOCATION */

    island:
      (
        stringOrNull(
          row.island
        ) as MediaAsset['island']
      ) ?? null,

    country:
      stringOrNull(
        row.country
      ),

    region:
      stringOrNull(
        row.region
      ),

    city:
      stringOrNull(
        row.city
      ),

    neighborhood:
      stringOrNull(
        row.neighborhood
      ),

    locationName:
      stringOrNull(
        row.location_name
      ),

    latitude:
      numberOrNull(
        row.latitude
      ),

    longitude:
      numberOrNull(
        row.longitude
      ),

    /* TAXONOMY */

    language:
      stringOrNull(
        row.language
      ),

    categoryId:
      stringOrNull(
        row.category_id
      ),

    /*
     * Relations will be populated by dedicated
     * queries in later Media Library steps.
     */
    category: null,

    tags: [],

    /* PRESENTATION */

    focalPointX:
      numberOrNull(
        row.focal_point_x
      ),

    focalPointY:
      numberOrNull(
        row.focal_point_y
      ),

    displayCaption:
      booleanOrDefault(
        row.display_caption,
        true
      ),

    displayCredit:
      booleanOrDefault(
        row.display_credit,
        true
      ),

    decorative:
      booleanOrDefault(
        row.decorative,
        false
      ),

    sensitiveLevel:
      (
        row.sensitive_level ??
        'none'
      ) as MediaSensitiveLevel,

    /* NEWSROOM */

    internalNotes:
      stringOrNull(
        row.internal_notes
      ),

    uploadedBy:
      row.uploaded_by as string,

    uploadedByName: null,

    lastEditedBy:
      stringOrNull(
        row.last_edited_by
      ),

    lastEditedByName: null,

    /* SUPERSESSION */

    isSuperseded:
      booleanOrDefault(
        row.is_superseded,
        false
      ),

    supersededBy:
      stringOrNull(
        row.superseded_by
      ),

    /* RELATIONS / COMPUTED */

    collections: [],

    usageCount: 0,

    isFavorite:
      favoriteMediaIds?.has(
        row.id as string
      ) ?? false,

    /* TIMESTAMPS */

    createdAt:
      row.created_at as string,

    updatedAt:
      row.updated_at as string,
  };
}

/* ========================================================= */
/* LIST MEDIA */
/* ========================================================= */

export async function getMediaAssets(
  opts?: GetMediaAssetsOptions
): Promise<MediaAssetListResult> {
  const supabase =
    await getDataClient();

  const page = Math.max(
    1,
    opts?.page ?? 1
  );

  const perPage = Math.min(
    100,
    Math.max(
      1,
      opts?.perPage ?? 24
    )
  );

  const favoriteMediaIds =
  new Set<string>(
    opts?.favoriteMediaIds ??
      []
  );

  const offset =
    (page - 1) * perPage;

  let query = supabase
    .from('media_assets')
    .select(
      '*',
      {
        count: 'exact',
      }
    );

  /* SEARCH */

  if (opts?.search) {
    const search =
      sanitizeSearchTerm(
        opts.search
      );

    if (search) {
      query = query.or(
        [
          `file_name.ilike.%${search}%`,
          `original_file_name.ilike.%${search}%`,
          `title.ilike.%${search}%`,
          `alt_text.ilike.%${search}%`,
          `caption.ilike.%${search}%`,
          `description.ilike.%${search}%`,
          `credit.ilike.%${search}%`,
          `photographer.ilike.%${search}%`,
          `creator_name.ilike.%${search}%`,
          `copyright_holder.ilike.%${search}%`,
          `source_name.ilike.%${search}%`,
          `location_name.ilike.%${search}%`,
          `city.ilike.%${search}%`,
          `region.ilike.%${search}%`,
          `country.ilike.%${search}%`,
        ].join(',')
      );
    }
  }

  /* FILTERS */

  if (opts?.status) {
    query = query.eq(
      'status',
      opts.status
    );
  }

  if (opts?.assetType) {
    query = query.eq(
      'asset_type',
      opts.assetType
    );
  }

  if (opts?.rightsStatus) {
    query = query.eq(
      'rights_status',
      opts.rightsStatus
    );
  }

  if (opts?.island) {
    query = query.eq(
      'island',
      opts.island as IslandScope
    );
  }

  if (opts?.categoryId) {
    query = query.eq(
      'category_id',
      opts.categoryId
    );
  }

  if (opts?.uploadedBy) {
    query = query.eq(
      'uploaded_by',
      opts.uploadedBy
    );
  }

  if (opts?.photographer) {
    query = query.eq(
      'photographer',
      opts.photographer
    );
  }

  if (opts?.sourceName) {
    query = query.eq(
      'source_name',
      opts.sourceName
    );
  }

  if (
    opts?.favoriteOnly
  ) {
    const ids =
      Array.from(
        favoriteMediaIds
      );
  
    if (
      ids.length === 0
    ) {
      return {
        items: [],
        total: 0,
        page,
        perPage,
        totalPages: 0,
      };
    }
  
    query =
      query.in(
        'id',
        ids
      );
  }

  /*
   * Favorites require the media_favorites relation.
   * We will wire favorite-only filtering when the
   * dedicated favorites API is added.
   */

  /* SORTING */

  switch (opts?.sort) {
    case 'oldest':
      query = query.order(
        'created_at',
        {
          ascending: true,
        }
      );
      break;

    case 'updated':
      query = query.order(
        'updated_at',
        {
          ascending: false,
        }
      );
      break;

    case 'filename_asc':
      query = query.order(
        'file_name',
        {
          ascending: true,
        }
      );
      break;

    case 'filename_desc':
      query = query.order(
        'file_name',
        {
          ascending: false,
        }
      );
      break;

    case 'largest':
      query = query.order(
        'file_size',
        {
          ascending: false,
          nullsFirst: false,
        }
      );
      break;

    case 'smallest':
      query = query.order(
        'file_size',
        {
          ascending: true,
          nullsFirst: false,
        }
      );
      break;

    case 'newest':
    default:
      query = query.order(
        'created_at',
        {
          ascending: false,
        }
      );
      break;
  }

  query = query.range(
    offset,
    offset + perPage - 1
  );

  const {
    data,
    count,
    error,
  } = await query;

  if (error) {
    console.error(
      'Failed to load media assets:',
      error
    );

    return {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 0,
    };
  }

  const items =
  (data ?? []).map(
    (
      row
    ) =>
      mapMediaRow(
        row as Record<
          string,
          unknown
        >,
        favoriteMediaIds
      )
  );

  const total =
    count ?? 0;

  return {
    items,

    total,

    page,

    perPage,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total /
              perPage
          ),
  };
}

/* ========================================================= */
/* GET SINGLE ASSET */
/* ========================================================= */

export async function getMediaAsset(
  id: string
): Promise<MediaAsset | null> {
  const supabase =
    await getDataClient();

  const {
    data,
    error,
  } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(
      'Failed to load media asset:',
      error
    );

    return null;
  }

  return data
    ? mapMediaRow(
        data as Record<
          string,
          unknown
        >
      )
    : null;
}

/* ========================================================= */
/* UPDATE */
/* ========================================================= */

export async function updateMediaAsset(
  id: string,
  update: MediaAssetUpdate
): Promise<boolean> {
  const supabase =
    await getDataClient();

  /*
   * database.types.ts may not yet contain fields introduced
   * by the newest migration. Build the payload separately
   * and cast once at the database boundary.
   */
  const updateData: Record<
    string,
    unknown
  > = {};

  if (
    update.title !== undefined
  ) {
    updateData.title =
      update.title;
  }

  if (
    update.altText !== undefined
  ) {
    updateData.alt_text =
      update.altText;
  }

  if (
    update.caption !== undefined
  ) {
    updateData.caption =
      update.caption;
  }

  if (
    update.description !==
    undefined
  ) {
    updateData.description =
      update.description;
  }

  if (
    update.credit !== undefined
  ) {
    updateData.credit =
      update.credit;
  }

  if (
    update.photographer !==
    undefined
  ) {
    updateData.photographer =
      update.photographer;
  }

  if (
    update.creatorName !==
    undefined
  ) {
    updateData.creator_name =
      update.creatorName;
  }

  if (
    update.copyrightHolder !==
    undefined
  ) {
    updateData.copyright_holder =
      update.copyrightHolder;
  }

  if (
    update.sourceName !==
    undefined
  ) {
    updateData.source_name =
      update.sourceName;
  }

  if (
    update.sourceUrl !==
    undefined
  ) {
    updateData.source_url =
      update.sourceUrl;
  }

  if (
    update.assetType !==
    undefined
  ) {
    updateData.asset_type =
      update.assetType;
  }

  if (
    update.status !== undefined
  ) {
    updateData.status =
      update.status;
  }

  if (
    update.rightsStatus !==
    undefined
  ) {
    updateData.rights_status =
      update.rightsStatus;
  }

  if (
    update.licenseName !==
    undefined
  ) {
    updateData.license_name =
      update.licenseName;
  }

  if (
    update.rightsNotes !==
    undefined
  ) {
    updateData.rights_notes =
      update.rightsNotes;
  }

  if (
    update.allowedUses !==
    undefined
  ) {
    updateData.allowed_uses =
      update.allowedUses;
  }

  if (
    update.restrictions !==
    undefined
  ) {
    updateData.restrictions =
      update.restrictions;
  }

  if (
    update.licenseExpiresAt !==
    undefined
  ) {
    updateData.license_expires_at =
      update.licenseExpiresAt;
  }

  if (
    update.embargoUntil !==
    undefined
  ) {
    updateData.embargo_until =
      update.embargoUntil;
  }

  if (
    update.dateCreated !==
    undefined
  ) {
    updateData.date_created =
      update.dateCreated;
  }

  if (
    update.approximateDate !==
    undefined
  ) {
    updateData.approximate_date =
      update.approximateDate;
  }

  if (
    update.island !== undefined
  ) {
    updateData.island =
      update.island;
  }

  if (
    update.country !== undefined
  ) {
    updateData.country =
      update.country;
  }

  if (
    update.region !== undefined
  ) {
    updateData.region =
      update.region;
  }

  if (
    update.city !== undefined
  ) {
    updateData.city =
      update.city;
  }

  if (
    update.neighborhood !==
    undefined
  ) {
    updateData.neighborhood =
      update.neighborhood;
  }

  if (
    update.locationName !==
    undefined
  ) {
    updateData.location_name =
      update.locationName;
  }

  if (
    update.latitude !== undefined
  ) {
    updateData.latitude =
      update.latitude;
  }

  if (
    update.longitude !==
    undefined
  ) {
    updateData.longitude =
      update.longitude;
  }

  if (
    update.language !== undefined
  ) {
    updateData.language =
      update.language;
  }

  if (
    update.categoryId !==
    undefined
  ) {
    updateData.category_id =
      update.categoryId;
  }

  if (
    update.focalPointX !==
    undefined
  ) {
    updateData.focal_point_x =
      update.focalPointX;
  }

  if (
    update.focalPointY !==
    undefined
  ) {
    updateData.focal_point_y =
      update.focalPointY;
  }

  if (
    update.displayCaption !==
    undefined
  ) {
    updateData.display_caption =
      update.displayCaption;
  }

  if (
    update.displayCredit !==
    undefined
  ) {
    updateData.display_credit =
      update.displayCredit;
  }

  if (
    update.decorative !==
    undefined
  ) {
    updateData.decorative =
      update.decorative;
  }

  if (
    update.sensitiveLevel !==
    undefined
  ) {
    updateData.sensitive_level =
      update.sensitiveLevel;
  }

  if (
    update.internalNotes !==
    undefined
  ) {
    updateData.internal_notes =
      update.internalNotes;
  }

  if (
    update.isSuperseded !==
    undefined
  ) {
    updateData.is_superseded =
      update.isSuperseded;
  }

  if (
    update.supersededBy !==
    undefined
  ) {
    updateData.superseded_by =
      update.supersededBy;
  }

  if (
    update.approvedBy !==
    undefined
  ) {
    updateData.approved_by =
      update.approvedBy;
  }

  if (
    update.approvedAt !==
    undefined
  ) {
    updateData.approved_at =
      update.approvedAt;
  }

  if (
    update.archivedAt !==
    undefined
  ) {
    updateData.archived_at =
      update.archivedAt;
  }

  if (
    update.trashedAt !==
    undefined
  ) {
    updateData.trashed_at =
      update.trashedAt;
  }

  if (
    update.lastEditedBy !==
    undefined
  ) {
    updateData.last_edited_by =
      update.lastEditedBy;
  }

  const {
    error,
  } = await supabase
    .from('media_assets')
    .update(
      updateData as Database['public']['Tables']['media_assets']['Update']
    )
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      'Failed to update media asset:',
      error
    );
  }

  return !error;
}

/* ========================================================= */
/* CREATE */
/* ========================================================= */

export async function createMediaAssetRecord(
  input: CreateMediaAssetInput
): Promise<MediaAsset | null> {
  const supabase =
    await getDataClient();

  const insertData: Record<
    string,
    unknown
  > = {
    url:
      input.url,

    storage_path:
      input.storagePath,

    file_name:
      input.fileName,

    original_file_name:
      input.originalFileName ??
      input.fileName,

    mime_type:
      input.mimeType,

    asset_type:
      input.assetType ??
      'image',

    width:
      input.width ??
      null,

    height:
      input.height ??
      null,

    file_size:
      input.fileSize ??
      null,

    checksum:
      input.checksum ??
      null,

    title:
      input.title ??
      null,

    alt_text:
      input.altText ??
      '',

    caption:
      input.caption ??
      null,

    description:
      input.description ??
      null,

    credit:
      input.credit ??
      null,

    photographer:
      input.photographer ??
      null,

    creator_name:
      input.creatorName ??
      null,

    copyright_holder:
      input.copyrightHolder ??
      null,

    source_name:
      input.sourceName ??
      null,

    source_url:
      input.sourceUrl ??
      null,

    rights_status:
      input.rightsStatus ??
      'unknown',

    license_name:
      input.licenseName ??
      null,

    rights_notes:
      input.rightsNotes ??
      null,

    allowed_uses:
      input.allowedUses ??
      [],

    restrictions:
      input.restrictions ??
      [],

    license_expires_at:
      input.licenseExpiresAt ??
      null,

    embargo_until:
      input.embargoUntil ??
      null,

    date_created:
      input.dateCreated ??
      null,

    approximate_date:
      input.approximateDate ??
      null,

    island:
      input.island ??
      null,

    country:
      input.country ??
      null,

    region:
      input.region ??
      null,

    city:
      input.city ??
      null,

    neighborhood:
      input.neighborhood ??
      null,

    location_name:
      input.locationName ??
      null,

    latitude:
      input.latitude ??
      null,

    longitude:
      input.longitude ??
      null,

    language:
      input.language ??
      null,

    category_id:
      input.categoryId ??
      null,

    focal_point_x:
      input.focalPointX ??
      null,

    focal_point_y:
      input.focalPointY ??
      null,

    display_caption:
      input.displayCaption ??
      true,

    display_credit:
      input.displayCredit ??
      true,

    decorative:
      input.decorative ??
      false,

    sensitive_level:
      input.sensitiveLevel ??
      'none',

    internal_notes:
      input.internalNotes ??
      null,

    /*
     * The migration defines new assets as drafts.
     * We intentionally do not override status here.
     */

    uploaded_by:
      input.uploadedBy,

    last_edited_by:
      input.uploadedBy,
  };

  const {
    data,
    error,
  } = await supabase
    .from('media_assets')
    .insert(
      insertData as Database['public']['Tables']['media_assets']['Insert']
    )
    .select('*')
    .single();

  if (error) {
    console.error(
      'Failed to create media asset:',
      error
    );

    return null;
  }

  return data
    ? mapMediaRow(
        data as Record<
          string,
          unknown
        >
      )
    : null;
}

/* ========================================================= */
/* ARCHIVE */
/* ========================================================= */

export async function archiveMediaAsset(
  id: string,
  userId: string
): Promise<boolean> {
  return updateMediaAsset(
    id,
    {
      status:
        'archived',

      archivedAt:
        new Date().toISOString(),

      trashedAt:
        null,

      lastEditedBy:
        userId,
    }
  );
}

/* ========================================================= */
/* MOVE TO TRASH */
/* ========================================================= */

export async function trashMediaAsset(
  id: string,
  userId: string
): Promise<boolean> {
  return updateMediaAsset(
    id,
    {
      status:
        'trashed',

      trashedAt:
        new Date().toISOString(),

      lastEditedBy:
        userId,
    }
  );
}

/* ========================================================= */
/* RESTORE FROM ARCHIVE / TRASH */
/* ========================================================= */

export async function restoreMediaAsset(
  id: string,
  userId: string
): Promise<boolean> {
  return updateMediaAsset(
    id,
    {
      status:
        'approved',

      archivedAt:
        null,

      trashedAt:
        null,

      lastEditedBy:
        userId,
    }
  );
}

/* ========================================================= */
/* APPROVE */
/* ========================================================= */

export async function approveMediaAsset(
  id: string,
  userId: string
): Promise<boolean> {
  return updateMediaAsset(
    id,
    {
      status:
        'approved',

      approvedBy:
        userId,

      approvedAt:
        new Date().toISOString(),

      archivedAt:
        null,

      trashedAt:
        null,

      lastEditedBy:
        userId,
    }
  );
}

/* ========================================================= */
/* PERMANENT DELETE */
/* ========================================================= */

/**
 * Permanently removes the storage object and database record.
 *
 * This should eventually be exposed ONLY from Trash and only
 * after usage checks confirm the asset is safe to remove.
 */
export async function deleteMediaAsset(
  id: string,
  storagePath: string
): Promise<boolean> {
  const supabase =
    await getDataClient();

  /*
   * Delete storage first.
   *
   * If storage deletion fails we do NOT remove the database
   * record, preventing an orphaned asset state.
   */
  const {
    error: storageError,
  } = await supabase.storage
    .from('media')
    .remove([
      storagePath,
    ]);

  if (storageError) {
    console.error(
      'Failed to delete media storage object:',
      storageError
    );

    return false;
  }

  const {
    error,
  } = await supabase
    .from('media_assets')
    .delete()
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      'Failed to permanently delete media asset:',
      error
    );
  }

  return !error;
}
