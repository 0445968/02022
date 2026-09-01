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
  const [
    headline,
    setHeadline,
  ] = useState(
    story.headline
  );

  const [
    subheadline,
    setSubheadline,
  ] = useState(
    story.subheadline ??
      ''
  );

  const [
    summary,
    setSummary,
  ] = useState(
    story.summary ??
      ''
  );

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

  const [
    language,
    setLanguage,
  ] = useState<
    StoryLanguage
  >(
    story.language
  );

  const [
    status,
    setStatus,
  ] = useState<
    StoryStatus
  >(
    story.status
  );

  const [
    accessLevel,
    setAccessLevel,
  ] = useState<
    AccessLevel
  >(
    story.accessLevel
  );

  const [
    authorId,
    setAuthorId,
  ] = useState<
    string | null
  >(
    story.author?.id ??
      null
  );

  const [
    editorId,
    setEditorId,
  ] = useState<
    string | null
  >(
    story.editor?.id ??
      null
  );

  const [
    island,
    setIsland,
  ] = useState<
    IslandScope
  >(
    story.island
  );

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    story.seoTitle ??
      ''
  );

  const [
    seoDescription,
    setSeoDescription,
  ] = useState(
    story.seoDescription ??
      ''
  );

  const [
    slug,
    setSlug,
  ] = useState(
    story.slug
  );

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
   * System-controlled actual West Island Times
   * publication timestamp.
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

  const savePayload =
    useMemo<
      StorySavePayload
    >(
      () => ({
        headline,

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

        /**
         * Do not allow editor autosave to overwrite
         * the actual West Island Times publication
         * timestamp.
         */
        publishedAt:
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
        slug,
        status,
        subheadline,
        summary,
        tagIds,
      ]
    );

  return {
    headline,
    setHeadline,

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