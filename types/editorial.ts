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

export interface MediaAsset {
  id: string;

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

  altText: string;

  caption:
    | string
    | null;

  credit:
    | string
    | null;

  uploadedBy: string;

  createdAt: string;
  updatedAt: string;
}

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