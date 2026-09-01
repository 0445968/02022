'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryWithRelations,
} from '@/types/editorial';

import type {
  StoryLanguage,
  AccessLevel,
  IslandScope,
} from '@/lib/db/database.types';

interface StoryRevisionData {
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

  language:
    StoryLanguage;

  accessLevel:
    AccessLevel;

  authorId:
    | string
    | null;

  editorId:
    | string
    | null;

  primaryCategoryId:
    | string
    | null;

  categoryIds:
    string[];

  tagIds:
    string[];

  island:
    IslandScope;

  featuredImageId:
    | string
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

  slug: string;

  originallyPublishedAt:
    | string
    | null;

  scheduledAt:
    | string
    | null;
}

interface RevisionStateSetters {
  setHeadline:
    (value: string) => void;

  setSubheadline:
    (value: string) => void;

  setSummary:
    (value: string) => void;

  setBody:
    (
      value:
        Record<
          string,
          unknown
        >
    ) => void;

  setLanguage:
    (
      value:
        StoryLanguage
    ) => void;

  setAccessLevel:
    (
      value:
        AccessLevel
    ) => void;

  setAuthorId:
    (
      value:
        | string
        | null
    ) => void;

  setEditorId:
    (
      value:
        | string
        | null
    ) => void;

  setIsland:
    (
      value:
        IslandScope
    ) => void;

  setSlug:
    (
      value: string
    ) => void;

  setSeoTitle:
    (
      value: string
    ) => void;

  setSeoDescription:
    (
      value: string
    ) => void;

  setOriginallyPublishedAt:
    (
      value: string
    ) => void;

  setScheduledAt:
    (
      value: string
    ) => void;
}

interface RevisionTaxonomySetters {
  setPrimaryCategoryId:
    (
      value:
        | string
        | null
    ) => void;

  setSelectedCategoryIds:
    (
      value:
        string[]
    ) => void;

  setTagIds:
    (
      value:
        string[]
    ) => void;
}

interface RevisionMediaLoader {
  loadRevisionMedia:
    (options: {
      featuredImageId:
        | string
        | null;

      imageCaption:
        | string
        | null;

      imageCredit:
        | string
        | null;

      publishedFeaturedImage:
        StoryWithRelations[
          'featuredImage'
        ];
    }) => void;
}

interface UseStoryRevisionOptions {
  story:
    StoryWithRelations;

  dict:
    Dictionary;

  isPublishedStory:
    boolean;

  state:
    RevisionStateSetters;

  taxonomy:
    RevisionTaxonomySetters;

  media:
    RevisionMediaLoader;

  onError:
    (
      message:
        string | null
    ) => void;
}

export function useStoryRevision({
  story,
  dict,
  isPublishedStory,
  state,
  taxonomy,
  media,
  onError,
}: UseStoryRevisionOptions) {
  const [
    revisionLoaded,
    setRevisionLoaded,
  ] = useState(
    !isPublishedStory
  );

  const [
    hasPendingRevision,
    setHasPendingRevision,
  ] = useState(false);

  const [
    revision,
    setRevision,
  ] = useState<
    StoryRevisionData | null
  >(null);

  const loadRevision =
    useCallback(
      async () => {
        if (
          !isPublishedStory
        ) {
          setRevision(
            null
          );

          setHasPendingRevision(
            false
          );

          setRevisionLoaded(
            true
          );

          return;
        }

        setRevisionLoaded(
          false
        );

        try {
          const response =
            await fetch(
              `/api/stories/${story.id}/revision`,
              {
                cache:
                  'no-store',
              }
            );

          if (
            !response.ok
          ) {
            const data =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              data.error ??
                'Unable to load unpublished changes'
            );
          }

          const data =
            await response.json();

          const nextRevision =
            data.revision as
              | StoryRevisionData
              | null;

          if (
            !nextRevision
          ) {
            setRevision(
              null
            );

            setHasPendingRevision(
              false
            );

            setRevisionLoaded(
              true
            );

            return;
          }

          setRevision(
            nextRevision
          );

          setHasPendingRevision(
            true
          );

          state.setHeadline(
            nextRevision.headline
          );

          state.setSubheadline(
            nextRevision.subheadline ??
              ''
          );

          state.setSummary(
            nextRevision.summary ??
              ''
          );

          state.setBody(
            nextRevision.body
          );

          state.setLanguage(
            nextRevision.language
          );

          state.setAccessLevel(
            nextRevision.accessLevel
          );

          state.setAuthorId(
            nextRevision.authorId
          );

          state.setEditorId(
            nextRevision.editorId
          );

          taxonomy.setPrimaryCategoryId(
            nextRevision.primaryCategoryId
          );

          taxonomy.setSelectedCategoryIds(
            nextRevision.categoryIds ??
              []
          );

          taxonomy.setTagIds(
            nextRevision.tagIds ??
              []
          );

          state.setIsland(
            nextRevision.island
          );

          media.loadRevisionMedia({
            featuredImageId:
              nextRevision.featuredImageId,

            imageCaption:
              nextRevision.imageCaption,

            imageCredit:
              nextRevision.imageCredit,

            publishedFeaturedImage:
              story.featuredImage,
          });

          state.setSeoTitle(
            nextRevision.seoTitle ??
              ''
          );

          state.setSeoDescription(
            nextRevision.seoDescription ??
              ''
          );

          state.setSlug(
            nextRevision.slug
          );

          state.setOriginallyPublishedAt(
            nextRevision.originallyPublishedAt
              ? nextRevision.originallyPublishedAt.slice(
                  0,
                  10
                )
              : ''
          );

          state.setScheduledAt(
            nextRevision.scheduledAt
              ? nextRevision.scheduledAt.slice(
                  0,
                  16
                )
              : ''
          );

          onError(
            null
          );
        } catch (
          revisionError
        ) {
          console.error(
            'Unable to load story revision:',
            revisionError
          );

          onError(
            revisionError instanceof
              Error
              ? revisionError.message
              : dict.common
                  .errorDesc
          );
        } finally {
          setRevisionLoaded(
            true
          );
        }
      },
      [
        dict.common.errorDesc,
        isPublishedStory,
        media,
        onError,
        state,
        story.featuredImage,
        story.id,
        taxonomy,
      ]
    );

  useEffect(() => {
    void loadRevision();
  }, [
    loadRevision,
  ]);

  /**
   * Call after a successful revision autosave.
   */
  const markRevisionPending =
    useCallback(() => {
      if (
        isPublishedStory
      ) {
        setHasPendingRevision(
          true
        );
      }
    }, [
      isPublishedStory,
    ]);

  /**
   * Removes the unpublished working revision.
   *
   * The live published story remains untouched.
   */
  const discardRevision =
    useCallback(
      async () => {
        onError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/stories/${story.id}/revision`,
              {
                method:
                  'DELETE',
              }
            );

          if (
            !response.ok
          ) {
            const data =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              data.error ??
                'Unable to revert changes'
            );
          }

          setRevision(
            null
          );

          setHasPendingRevision(
            false
          );

          return true;
        } catch (
          revertError
        ) {
          console.error(
            'Revert story changes failed:',
            revertError
          );

          onError(
            revertError instanceof
              Error
              ? revertError.message
              : dict.common
                  .errorDesc
          );

          return false;
        }
      },
      [
        dict.common.errorDesc,
        onError,
        story.id,
      ]
    );

  /**
   * Used after publishing a revision.
   */
  const clearPendingRevision =
    useCallback(() => {
      setRevision(
        null
      );

      setHasPendingRevision(
        false
      );
    }, []);

  return {
    revision,

    revisionLoaded,

    hasPendingRevision,

    loadRevision,

    markRevisionPending,

    discardRevision,

    clearPendingRevision,
  };
}