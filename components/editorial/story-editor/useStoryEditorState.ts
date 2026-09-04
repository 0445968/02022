'use client';

import {
  useMemo,
  useState,
} from 'react';

import type {
  AccessLevel,
  IslandScope,
  StoryLanguage,
  StoryStatus,
} from '@/lib/db/database.types';

import type {
  StoryWithRelations,
} from '@/types/editorial';

import type {
  StorySavePayload,
} from './types';

interface UseStoryEditorStateOptions {
  story:
    StoryWithRelations;

  selectedCategoryIds:
    string[];

  tagIds:
    string[];

  featuredImageId:
    string | null;

  imageCaption:
    string;

  imageCredit:
    string;

  primaryCategoryId:
    string | null;
}

export function useStoryEditorState({
  story,
  selectedCategoryIds,
  tagIds,
  featuredImageId,
  imageCaption,
  imageCredit,
  primaryCategoryId,
}: UseStoryEditorStateOptions) {
  // ==================================================
  // Headline
  // ==================================================

  const [
    headline,
    setHeadline,
  ] = useState(
    story.headline
  );

  // ==================================================
  // Short title
  // ==================================================
  //
  // This is the compact version of the headline.
  // It will be used later by the story bar below
  // the main navigation.
  //
  // Existing stories may not have one, so we
  // fall back to an empty string in the editor.
  // ==================================================

  const [
    shortTitle,
    setShortTitle,
  ] = useState(
    story.shortTitle ?? ''
  );

  // ==================================================
  // Subheadline
  // ==================================================

  const [
    subheadline,
    setSubheadline,
  ] = useState(
    story.subheadline ??
      ''
  );

  // ==================================================
  // Summary
  // ==================================================

  const [
    summary,
    setSummary,
  ] = useState(
    story.summary ??
      ''
  );

  // ==================================================
  // Body
  // ==================================================

  const [
    body,
    setBody,
  ] = useState<
    Record<
      string,
      unknown
    >
  >(
    story.body
  );

  // ==================================================
  // Language
  // ==================================================

  const [
    language,
    setLanguage,
  ] = useState<
    StoryLanguage
  >(
    story.language
  );

  // ==================================================
  // Status
  // ==================================================

  const [
    status,
    setStatus,
  ] = useState<
    StoryStatus
  >(
    story.status
  );

  // ==================================================
  // Access level
  // ==================================================

  const [
    accessLevel,
    setAccessLevel,
  ] = useState<
    AccessLevel
  >(
    story.accessLevel
  );

  // ==================================================
  // Author
  // ==================================================

  const [
    authorId,
    setAuthorId,
  ] = useState<
    string | null
  >(
    story.author?.id ??
      null
  );

  // ==================================================
  // Editor
  // ==================================================

  const [
    editorId,
    setEditorId,
  ] = useState<
    string | null
  >(
    story.editor?.id ??
      null
  );

  // ==================================================
  // Island
  // ==================================================

  const [
    island,
    setIsland,
  ] = useState<
    IslandScope
  >(
    story.island
  );

  // ==================================================
  // SEO title
  // ==================================================

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    story.seoTitle ??
      ''
  );

  // ==================================================
  // SEO description
  // ==================================================

  const [
    seoDescription,
    setSeoDescription,
  ] = useState(
    story.seoDescription ??
      ''
  );

  // ==================================================
  // Slug
  // ==================================================

  const [
    slug,
    setSlug,
  ] = useState(
    story.slug
  );

  // ==================================================
  // Original publication date
  // ==================================================

  const [
    originallyPublishedAt,
    setOriginallyPublishedAt,
  ] = useState(
    story.originallyPublishedAt
      ? story.originallyPublishedAt.slice(
          0,
          10
        )
      : ''
  );

  /**
   * System-controlled actual publication timestamp.
   *
   * We keep it available for display, but do NOT
   * include it in the autosave payload.
   */
  const [
    publishedAt,
  ] = useState(
    story.publishedAt
      ? story.publishedAt.slice(
          0,
          16
        )
      : ''
  );

  // ==================================================
  // Scheduled publication date
  // ==================================================

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState(
    story.scheduledAt
      ? story.scheduledAt.slice(
          0,
          16
        )
      : ''
  );

  // ==================================================
  // Save payload
  // ==================================================
  //
  // This is the object that gets sent to your
  // story autosave / update API.
  //
  // shortTitle is converted to null when empty.
  // ==================================================

  const savePayload =
    useMemo<
      StorySavePayload
    >(
      () => ({
        headline,

        shortTitle:
          shortTitle.trim() ||
          null,

        subheadline:
          subheadline ||
          null,

        summary:
          summary ||
          null,

        body,

        language,

        status,

        accessLevel,

        authorId,

        editorId,

        primaryCategoryId,

        island,

        featuredImageId,

        imageCaption:
          imageCaption ||
          null,

        imageCredit:
          imageCredit ||
          null,

        seoTitle:
          seoTitle ||
          null,

        seoDescription:
          seoDescription ||
          null,

        slug,

        originallyPublishedAt:
          originallyPublishedAt ||
          null,

        scheduledAt:
          scheduledAt ||
          null,

        categoryIds:
          selectedCategoryIds,

        tagIds,

        createVersion:
          false,
      }),
      [
        accessLevel,
        authorId,
        body,
        editorId,
        featuredImageId,
        headline,
        imageCaption,
        imageCredit,
        island,
        language,
        originallyPublishedAt,
        primaryCategoryId,
        scheduledAt,
        selectedCategoryIds,
        seoDescription,
        seoTitle,
        shortTitle,
        slug,
        status,
        subheadline,
        summary,
        tagIds,
      ]
    );

  // ==================================================
  // Exposed editor state
  // ==================================================

  return {
    headline,
    setHeadline,

    shortTitle,
    setShortTitle,

    subheadline,
    setSubheadline,

    summary,
    setSummary,

    body,
    setBody,

    language,
    setLanguage,

    status,
    setStatus,

    accessLevel,
    setAccessLevel,

    authorId,
    setAuthorId,

    editorId,
    setEditorId,

    island,
    setIsland,

    seoTitle,
    setSeoTitle,

    seoDescription,
    setSeoDescription,

    slug,
    setSlug,

    originallyPublishedAt,
    setOriginallyPublishedAt,

    publishedAt,

    scheduledAt,
    setScheduledAt,

    savePayload,
  };
}