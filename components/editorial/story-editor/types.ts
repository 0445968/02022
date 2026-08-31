import type {
  AccessLevel,
  IslandScope,
  StoryLanguage,
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  Category,
  MediaAsset,
  StaffOption,
  StoryVersion,
  StoryWithRelations,
} from '@/types/editorial';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  Locale,
} from '@/types';

export type SaveState =
  | 'saved'
  | 'saving'
  | 'unsaved'
  | 'error';

export interface StoryEditorUser {
  id: string;
  profile: {
    isAuthor: boolean;
    isEditor: boolean;
  } | null;
}

export interface StoryEditorProps {
  dict: Dictionary;
  locale: Locale;
  story: StoryWithRelations;
  user: StoryEditorUser;
  categories: Category[];
  authors: StaffOption[];
  editors: StaffOption[];
  versions: StoryVersion[];
}

/**
 * Complete editable state for one story.
 *
 * This is the state owned by StoryEditor and shared
 * with the autosave hook and child components.
 */
export interface StoryEditorState {
  headline: string;
  subheadline: string;
  summary: string;

  body: Record<string, unknown>;

  language: StoryLanguage;
  status: StoryStatus;
  accessLevel: AccessLevel;

  authorId: string | null;
  editorId: string | null;

  primaryCategoryId: string | null;
  selectedCategoryIds: string[];

  tagIds: string[];

  island: IslandScope;

  featuredImage: MediaAsset | null;

  imageCaption: string;
  imageCredit: string;

  seoTitle: string;
  seoDescription: string;

  slug: string;

  publishedAt: string;
}

/**
 * Payload sent to:
 *
 * PUT /api/stories/[id]
 */
export interface StorySavePayload {
  headline: string;

  subheadline: string | null;
  summary: string | null;

  body: Record<string, unknown>;

  language: StoryLanguage;
  status: StoryStatus;
  accessLevel: AccessLevel;

  authorId: string | null;
  editorId: string | null;

  primaryCategoryId: string | null;

  island: IslandScope;

  featuredImageId: string | null;

  imageCaption: string | null;
  imageCredit: string | null;

  seoTitle: string | null;
  seoDescription: string | null;

  slug: string;

  publishedAt: string | null;

  categoryIds: string[];
  tagIds: string[];

  createVersion: boolean;
}

/**
 * Props shared by the desktop and mobile
 * settings panels.
 */
export interface StorySettingsPanelProps {
  dict: Dictionary;

  language: StoryLanguage;
  status: StoryStatus;
  accessLevel: AccessLevel;

  authorId: string | null;
  editorId: string | null;

  primaryCategoryId: string | null;
  selectedCategoryIds: string[];

  tags: {
    id: string;
    slug: string;
    name: string;
  }[];

  allTags: {
    id: string;
    slug: string;
    name: string;
  }[];

  tagSearch: string;

  island: IslandScope;

  featuredImage: MediaAsset | null;

  imageCaption: string;
  imageCredit: string;

  seoTitle: string;
  seoDescription: string;

  slug: string;
  slugLocked: boolean;

  publishedAt: string;

  versions: StoryVersion[];

  userIsEditor: boolean;

  categories: Category[];
  authors: StaffOption[];
  editors: StaffOption[];

  setLanguage: (
    value: StoryLanguage
  ) => void;

  setAccessLevel: (
    value: AccessLevel
  ) => void;

  setAuthorId: (
    value: string | null
  ) => void;

  setEditorId: (
    value: string | null
  ) => void;

  setPrimaryCategoryId: (
    value: string | null
  ) => void;

  setIsland: (
    value: IslandScope
  ) => void;

  setSlug: (
    value: string
  ) => void;

  setPublishedAt: (
    value: string
  ) => void;

  setImageCaption: (
    value: string
  ) => void;

  setImageCredit: (
    value: string
  ) => void;

  setSeoTitle: (
    value: string
  ) => void;

  setSeoDescription: (
    value: string
  ) => void;

  toggleCategory: (
    categoryId: string
  ) => void;

  toggleTag: (
    tagId: string
  ) => void;

  searchTags: (
    query: string
  ) => void;

  createTag: (
    name: string
  ) => void;

  setFeaturedImage: (
    media: MediaAsset | null
  ) => void;

  setMediaPickerOpen: (
    open: boolean
  ) => void;

  handleRestoreVersion: (
    versionId: string
  ) => void;
}