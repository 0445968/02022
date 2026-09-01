'use client';

import {
  useState,
} from 'react';

interface StoryTag {
  id: string;
  slug: string;
  name: string;
}

interface UseStoryTaxonomyOptions {
  initialCategoryIds: string[];

  initialPrimaryCategoryId:
    | string
    | null;

  initialTags: StoryTag[];
}

export function useStoryTaxonomy({
  initialCategoryIds,
  initialPrimaryCategoryId,
  initialTags,
}: UseStoryTaxonomyOptions) {
  const [
    selectedCategoryIds,
    setSelectedCategoryIds,
  ] = useState<string[]>(
    initialCategoryIds
  );

  const [
    primaryCategoryId,
    setPrimaryCategoryId,
  ] = useState<
    string | null
  >(
    initialPrimaryCategoryId
  );

  const [
    tagIds,
    setTagIds,
  ] = useState<string[]>(
    initialTags.map(
      (tag) => tag.id
    )
  );

  const [
    tags,
    setTags,
  ] = useState<StoryTag[]>(
    initialTags
  );

  const [
    allTags,
    setAllTags,
  ] = useState<StoryTag[]>(
    initialTags
  );

  const [
    tagSearch,
    setTagSearch,
  ] = useState('');

  // --------------------------------------------------
  // Categories
  // --------------------------------------------------

  function toggleCategory(
    categoryId: string
  ) {
    setSelectedCategoryIds(
      (current) => {
        if (
          current.includes(
            categoryId
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              categoryId
          );
        }

        return [
          ...current,
          categoryId,
        ];
      }
    );

    if (
      primaryCategoryId ===
      categoryId
    ) {
      setPrimaryCategoryId(
        null
      );
    }
  }

  // --------------------------------------------------
  // Tag search
  // --------------------------------------------------

  async function searchTags(
    query: string
  ) {
    setTagSearch(
      query
    );

    if (
      query.trim().length <
      2
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/tags?search=${encodeURIComponent(
            query
          )}`
        );

      if (
        !response.ok
      ) {
        return;
      }

      const data =
        await response.json();

      setAllTags(
        data.tags ?? []
      );
    } catch (
      searchError
    ) {
      console.error(
        'Tag search failed:',
        searchError
      );
    }
  }

  // --------------------------------------------------
  // Toggle tag
  // --------------------------------------------------

  function toggleTag(
    tagId: string
  ) {
    const alreadySelected =
      tagIds.includes(
        tagId
      );

    if (
      alreadySelected
    ) {
      setTagIds(
        (current) =>
          current.filter(
            (id) =>
              id !==
              tagId
          )
      );

      setTags(
        (current) =>
          current.filter(
            (tag) =>
              tag.id !==
              tagId
          )
      );

      return;
    }

    setTagIds(
      (current) => [
        ...current,
        tagId,
      ]
    );

    const tag =
      allTags.find(
        (item) =>
          item.id ===
          tagId
      );

    if (!tag) {
      return;
    }

    setTags(
      (current) => {
        if (
          current.some(
            (item) =>
              item.id ===
              tag.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          tag,
        ];
      }
    );
  }

  // --------------------------------------------------
  // Create tag
  // --------------------------------------------------

  async function createTag(
    name: string
  ) {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      const response =
        await fetch(
          '/api/tags',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                name:
                  trimmedName,
              }),
          }
        );

      if (
        !response.ok
      ) {
        return;
      }

      const tag =
        (await response.json()) as StoryTag;

      setTagIds(
        (current) => {
          if (
            current.includes(
              tag.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            tag.id,
          ];
        }
      );

      setTags(
        (current) => {
          if (
            current.some(
              (item) =>
                item.id ===
                tag.id
            )
          ) {
            return current;
          }

          return [
            ...current,
            tag,
          ];
        }
      );

      setAllTags(
        (current) => {
          if (
            current.some(
              (item) =>
                item.id ===
                tag.id
            )
          ) {
            return current;
          }

          return [
            tag,
            ...current,
          ];
        }
      );

      setTagSearch('');
    } catch (
      createTagError
    ) {
      console.error(
        'Create tag failed:',
        createTagError
      );
    }
  }

  return {
    // Categories
    selectedCategoryIds,
    setSelectedCategoryIds,

    primaryCategoryId,
    setPrimaryCategoryId,

    toggleCategory,

    // Tags
    tagIds,
    setTagIds,

    tags,
    setTags,

    allTags,
    setAllTags,

    tagSearch,
    setTagSearch,

    searchTags,
    toggleTag,
    createTag,
  };
}