import type {
  StoryLanguage,
  StoryStatus,
  AccessLevel,
  IslandScope,
  EditorialBylineStatus,
} from '@/lib/db/database.types';

/**
 * Editorial domain types for West Island Times.
 * These are the application-facing camelCase shapes
 * used throughout newsroom and public components.
 */

export type {
  StoryLanguage,
  StoryStatus,
  AccessLevel,
  IslandScope,
  EditorialBylineStatus,
};

/* ========================================================= */
/* TAXONOMY */
/* ========================================================= */

export interface Category {
  id: string;

  slug: string;

  nameEn: string;
  nameEs: string;

  descriptionEn:
    | string
    | null;

  descriptionEs:
    | string
    | null;

  active: boolean;

  sortOrder: number;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

/* ========================================================= */
/* MEDIA */
/* ========================================================= */

export type MediaAssetType =
  | 'image'
  | 'graphic'
  | 'video'
  | 'audio'
  | 'document'
  | 'logo'
  | 'social'
  | 'broadcast'
  | 'other';

export type MediaStatus =
  | 'draft'
  | 'approved'
  | 'restricted'
  | 'archived'
  | 'trashed';

export type MediaRightsStatus =
  | 'owned'
  | 'staff_created'
  | 'freelancer'
  | 'licensed'
  | 'wire_service'
  | 'government'
  | 'public_domain'
  | 'creative_commons'
  | 'reader_submitted'
  | 'restricted'
  | 'unknown';

export type MediaSensitiveLevel =
  | 'none'
  | 'sensitive'
  | 'disturbing'
  | 'graphic';

export type MediaAllowedUse =
  | 'website'
  | 'app'
  | 'social_media'
  | 'newsletter'
  | 'print'
  | 'advertising'
  | 'promotional'
  | 'archive';

export interface MediaAsset {
  id: string;

  /* ------------------------------------------------------- */
  /* FILE */
  /* ------------------------------------------------------- */

  url: string;

  storagePath: string;

  fileName: string;

  originalFileName:
    | string
    | null;

  mimeType: string;

  assetType: MediaAssetType;

  width:
    | number
    | null;

  height:
    | number
    | null;

  fileSize:
    | number
    | null;

  checksum:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* CORE EDITORIAL METADATA */
  /* ------------------------------------------------------- */

  title:
    | string
    | null;

  altText: string;

  caption:
    | string
    | null;

  description:
    | string
    | null;

  credit:
    | string
    | null;

  photographer:
    | string
    | null;

  creatorName:
    | string
    | null;

  copyrightHolder:
    | string
    | null;

  sourceName:
    | string
    | null;

  sourceUrl:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* WORKFLOW */
  /* ------------------------------------------------------- */

  status: MediaStatus;

  approvedBy:
    | string
    | null;

  approvedAt:
    | string
    | null;

  archivedAt:
    | string
    | null;

  trashedAt:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* RIGHTS + LICENSING */
  /* ------------------------------------------------------- */

  rightsStatus: MediaRightsStatus;

  licenseName:
    | string
    | null;

  rightsNotes:
    | string
    | null;

  allowedUses: string[];

  restrictions: string[];

  licenseExpiresAt:
    | string
    | null;

  embargoUntil:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* DATE / ARCHIVAL METADATA */
  /* ------------------------------------------------------- */

  dateCreated:
    | string
    | null;

  approximateDate:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* LOCATION */
  /* ------------------------------------------------------- */

  island:
    | IslandScope
    | null;

  country:
    | string
    | null;

  region:
    | string
    | null;

  city:
    | string
    | null;

  neighborhood:
    | string
    | null;

  locationName:
    | string
    | null;

  latitude:
    | number
    | null;

  longitude:
    | number
    | null;

  /* ------------------------------------------------------- */
  /* TAXONOMY */
  /* ------------------------------------------------------- */

  language:
    | string
    | null;

  categoryId:
    | string
    | null;

  category:
    | Category
    | null;

  tags: MediaTag[];

  /* ------------------------------------------------------- */
  /* IMAGE PRESENTATION */
  /* ------------------------------------------------------- */

  focalPointX:
    | number
    | null;

  focalPointY:
    | number
    | null;

  displayCaption: boolean;

  displayCredit: boolean;

  decorative: boolean;

  sensitiveLevel: MediaSensitiveLevel;

  /* ------------------------------------------------------- */
  /* NEWSROOM */
  /* ------------------------------------------------------- */

  internalNotes:
    | string
    | null;

  uploadedBy: string;

  uploadedByName:
    | string
    | null;

  lastEditedBy:
    | string
    | null;

  lastEditedByName:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* SUPERSESSION */
  /* ------------------------------------------------------- */

  isSuperseded: boolean;

  supersededBy:
    | string
    | null;

  /* ------------------------------------------------------- */
  /* RELATIONS / COMPUTED VALUES */
  /* ------------------------------------------------------- */

  collections: MediaCollectionSummary[];

  usageCount: number;

  isFavorite: boolean;

  /* ------------------------------------------------------- */
  /* TIMESTAMPS */
  /* ------------------------------------------------------- */

  createdAt: string;

  updatedAt: string;
}

export interface MediaTag {
  id: string;

  slug: string;

  name: string;
}

export interface MediaCollectionSummary {
  id: string;

  name: string;
}

export interface MediaCollection {
  id: string;

  name: string;

  description:
    | string
    | null;

  coverAssetId:
    | string
    | null;

  isShared: boolean;

  createdBy:
    | string
    | null;

  createdAt: string;

  updatedAt: string;

  itemCount: number;
}

export interface MediaUsage {
  id: string;

  mediaAssetId: string;

  usageType: string;

  storyId:
    | string
    | null;

  entityType:
    | string
    | null;

  entityId:
    | string
    | null;

  placement:
    | string
    | null;

  metadata: Record<
    string,
    unknown
  >;

  createdBy:
    | string
    | null;

  createdAt: string;
}

export interface MediaVersion {
  id: string;

  mediaAssetId: string;

  versionNumber: number;

  url: string;

  storagePath: string;

  fileName: string;

  mimeType: string;

  width:
    | number
    | null;

  height:
    | number
    | null;

  fileSize:
    | number
    | null;

  checksum:
    | string
    | null;

  changeNote:
    | string
    | null;

  createdBy:
    | string
    | null;

  createdAt: string;
}

export interface MediaAuditEntry {
  id: string;

  mediaAssetId:
    | string
    | null;

  userId:
    | string
    | null;

  action: string;

  beforeData:
    | Record<string, unknown>
    | null;

  afterData:
    | Record<string, unknown>
    | null;

  metadata: Record<
    string,
    unknown
  >;

  createdAt: string;
}

/* ========================================================= */
/* MEDIA LABEL MAPS */
/* ========================================================= */

export const MEDIA_STATUS_LABELS: Record<
  MediaStatus,
  {
    en: string;
    es: string;
  }
> = {
  draft: {
    en: 'Draft',
    es: 'Borrador',
  },

  approved: {
    en: 'Approved',
    es: 'Aprobado',
  },

  restricted: {
    en: 'Restricted',
    es: 'Restringido',
  },

  archived: {
    en: 'Archived',
    es: 'Archivado',
  },

  trashed: {
    en: 'Trash',
    es: 'Papelera',
  },
};

export const MEDIA_ASSET_TYPE_LABELS: Record<
  MediaAssetType,
  {
    en: string;
    es: string;
  }
> = {
  image: {
    en: 'Image',
    es: 'Imagen',
  },

  graphic: {
    en: 'Graphic',
    es: 'Gráfico',
  },

  video: {
    en: 'Video',
    es: 'Video',
  },

  audio: {
    en: 'Audio',
    es: 'Audio',
  },

  document: {
    en: 'Document',
    es: 'Documento',
  },

  logo: {
    en: 'Logo',
    es: 'Logo',
  },

  social: {
    en: 'Social',
    es: 'Social',
  },

  broadcast: {
    en: 'Broadcast',
    es: 'Transmisión',
  },

  other: {
    en: 'Other',
    es: 'Otro',
  },
};

export const MEDIA_RIGHTS_LABELS: Record<
  MediaRightsStatus,
  {
    en: string;
    es: string;
  }
> = {
  owned: {
    en: 'Owned by West Island Times',
    es: 'Propiedad de West Island Times',
  },

  staff_created: {
    en: 'Staff created',
    es: 'Creado por el personal',
  },

  freelancer: {
    en: 'Freelancer',
    es: 'Colaborador independiente',
  },

  licensed: {
    en: 'Licensed',
    es: 'Con licencia',
  },

  wire_service: {
    en: 'Wire / agency',
    es: 'Agencia de noticias',
  },

  government: {
    en: 'Government',
    es: 'Gobierno',
  },

  public_domain: {
    en: 'Public domain',
    es: 'Dominio público',
  },

  creative_commons: {
    en: 'Creative Commons',
    es: 'Creative Commons',
  },

  reader_submitted: {
    en: 'Reader submitted',
    es: 'Enviado por un lector',
  },

  restricted: {
    en: 'Restricted',
    es: 'Restringido',
  },

  unknown: {
    en: 'Unknown',
    es: 'Desconocido',
  },
};

export const MEDIA_SENSITIVE_LABELS: Record<
  MediaSensitiveLevel,
  {
    en: string;
    es: string;
  }
> = {
  none: {
    en: 'None',
    es: 'Ninguno',
  },

  sensitive: {
    en: 'Sensitive',
    es: 'Sensible',
  },

  disturbing: {
    en: 'Disturbing',
    es: 'Perturbador',
  },

  graphic: {
    en: 'Graphic',
    es: 'Gráfico',
  },
};

/* ========================================================= */
/* PEOPLE */
/* ========================================================= */

export interface StoryAuthor {
  id: string;

  name:
    | string
    | null;

  editorialTitle:
    | string
    | null;

  headshotUrl:
    | string
    | null;
}

/**
 * Public editorial identity.
 *
 * This contains byline and contributor-page information.
 * It does not grant Newsroom access.
 */
export interface EditorialProfile {
  id: string;

  /**
   * Optional link to the authenticated reader account.
   */
  accountId:
    | string
    | null;

  bylineName: string;

  slug: string;

  editorialTitle:
    | string
    | null;

  bio:
    | string
    | null;

  headshot:
    | MediaAsset
    | null;

  bylineStatus:
    EditorialBylineStatus;

  createdAt: string;

  updatedAt: string;
}

export interface StoryEditor {
  id: string;

  name:
    | string
    | null;

  editorialTitle:
    | string
    | null;

  headshotUrl:
    | string
    | null;
}

/* ========================================================= */
/* STORY RELATIONS */
/* ========================================================= */

export interface StoryCategory {
  id: string;

  slug: string;

  nameEn: string;
  nameEs: string;

  isPrimary: boolean;
}

export interface StoryTag {
  id: string;
  slug: string;
  name: string;
}

/* ========================================================= */
/* FULL STORY */
/* ========================================================= */

/**
 * Full story record with all relations resolved.
 *
 * Used by:
 * - newsroom editor
 * - newsroom preview
 * - public article view
 */
export interface StoryWithRelations {
  id: string;

  slug: string;

  headline: string;

  shortTitle:
  | string
  | null;

  subheadline:
    | string
    | null;

  summary:
    | string
    | null;

  body: Record<
    string,
    unknown
  >;

  language: StoryLanguage;

  status: StoryStatus;

  accessLevel: AccessLevel;

  island: IslandScope;

  author:
    | StoryAuthor
    | null;

  editor:
    | StoryEditor
    | null;

  primaryCategory:
    | Category
    | null;

  categories: StoryCategory[];

  tags: StoryTag[];

  featuredImage:
    | MediaAsset
    | null;

  imageCaption:
    | string
    | null;

  imageCredit:
    | string
    | null;

  seoTitle:
    | string
    | null;

  seoDescription:
    | string
    | null;

  /**
   * Optional historical/original publication date.
   *
   * This is editorial metadata only and does NOT
   * control whether the story appears publicly.
   */
  originallyPublishedAt:
    | string
    | null;

  /**
   * Actual West Island Times publication time.
   *
   * Public story queries use this timestamp to
   * determine when a published story becomes visible.
   */
  publishedAt:
    | string
    | null;

  /**
   * Future publication time for scheduled stories.
   */
  scheduledAt:
    | string
    | null;

  createdAt: string;

  updatedAt: string;
}

/* ========================================================= */
/* NEWSROOM STORY LIST */
/* ========================================================= */

/**
 * Lightweight story row used by newsroom lists and dashboards.
 */
export interface StoryListItem {
  id: string;

  slug: string;

  headline: string;

  shortTitle:
  | string
  | null;

  language: StoryLanguage;

  status: StoryStatus;

  accessLevel: AccessLevel;

  island: IslandScope;

  authorName:
    | string
    | null;

  editorName:
    | string
    | null;

  primaryCategoryNameEn:
    | string
    | null;

  primaryCategoryNameEs:
    | string
    | null;

  primaryCategorySlug:
    | string
    | null;

  publishedAt:
    | string
    | null;

  updatedAt: string;
}

/* ========================================================= */
/* VERSION HISTORY */
/* ========================================================= */

export interface StoryVersion {
  id: string;

  storyId: string;

  headline: string;

  shortTitle:
  | string
  | null;

  subheadline:
    | string
    | null;

  summary:
    | string
    | null;

  body: Record<
    string,
    unknown
  >;

  language: StoryLanguage;

  primaryCategoryId:
    | string
    | null;

  createdBy: string;

  createdByName:
    | string
    | null;

  createdAt: string;
}

/* ========================================================= */
/* STAFF OPTIONS */
/* ========================================================= */

/**
 * A person who can be assigned as an author or editor.
 */
export interface StaffOption {
  id: string;

  name: string;

  editorialTitle:
    | string
    | null;
}

/* ========================================================= */
/* LABEL MAPS */
/* ========================================================= */

export const STORY_STATUS_LABELS: Record<
  StoryStatus,
  {
    en: string;
    es: string;
  }
> = {
  draft: {
    en: 'Draft',
    es: 'Borrador',
  },

  in_review: {
    en: 'In Review',
    es: 'En revisión',
  },

  scheduled: {
    en: 'Scheduled',
    es: 'Programada',
  },

  published: {
    en: 'Published',
    es: 'Publicada',
  },

  archived: {
    en: 'Archived',
    es: 'Archivada',
  },
};

export const ACCESS_LEVEL_LABELS: Record<
  AccessLevel,
  {
    en: string;
    es: string;
  }
> = {
  public: {
    en: 'Public',
    es: 'Público',
  },

  registered: {
    en: 'Registered',
    es: 'Registrado',
  },

  subscriber: {
    en: 'Subscriber',
    es: 'Suscriptor',
  },

  premium: {
    en: 'Premium',
    es: 'Premium',
  },
};

export const ISLAND_LABELS: Record<
  IslandScope,
  {
    en: string;
    es: string;
  }
> = {
  san_andres: {
    en: 'San Andrés',
    es: 'San Andrés',
  },

  old_providence: {
    en: 'Old Providence',
    es: 'Providencia',
  },

  saint_catalina: {
    en: 'Saint Catalina',
    es: 'Santa Catalina',
  },

  archipelago: {
    en: 'Archipelago-wide',
    es: 'Todo el archipiélago',
  },

  none: {
    en: 'Not location-specific',
    es: 'Sin ubicación específica',
  },
};

/* ========================================================= */
/* LABEL HELPERS */
/* ========================================================= */

export function categoryLabel(
  category: {
    nameEn: string;
    nameEs: string;
  },
  locale: 'en' | 'es'
): string {
  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

export function islandLabel(
  island: IslandScope,
  locale: 'en' | 'es'
): string {
  return ISLAND_LABELS[
    island
  ][locale];
}

export function statusLabel(
  status: StoryStatus,
  locale: 'en' | 'es'
): string {
  return STORY_STATUS_LABELS[
    status
  ][locale];
}

export function accessLabel(
  level: AccessLevel,
  locale: 'en' | 'es'
): string {
  return ACCESS_LEVEL_LABELS[
    level
  ][locale];
}

/* ========================================================= */
/* PUBLIC STORY LIST */
/* ========================================================= */

export interface PublicStoryListItem {
  id: string;

  slug: string;

  headline: string;

  shortTitle:
  | string
  | null;

  summary:
    | string
    | null;

  language: StoryLanguage;

  island: IslandScope;

  publishedAt:
    | string
    | null;

  primaryCategorySlug:
    | string
    | null;

  primaryCategoryNameEn:
    | string
    | null;

  primaryCategoryNameEs:
    | string
    | null;

  featuredImageUrl:
    | string
    | null;

  featuredImageAlt:
    | string
    | null;

  authorName:
    | string
    | null;
}

export interface PublicListResult {
  items: PublicStoryListItem[];

  total: number;

  page: number;

  perPage: number;

  totalPages: number;
}