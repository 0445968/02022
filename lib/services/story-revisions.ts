import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  import type {
    AccessLevel,
    IslandScope,
    StoryLanguage,
    StoryStatus,
  } from '@/lib/db/database.types';
  
  export interface StoryRevision {
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
  
    status:
      StoryStatus;
  
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
  
    createdBy:
      | string
      | null;
  
    updatedBy:
      | string
      | null;
  
    createdAt: string;
  
    updatedAt: string;
  }
  
  export interface SaveStoryRevisionInput {
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
  
    status?:
      StoryStatus;
  
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
  
    userId: string;
  }
  
  interface StoryRevisionRow {
    id: string;
  
    story_id: string;
  
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
  
    status:
      StoryStatus;
  
    access_level:
      AccessLevel;
  
    author_id:
      | string
      | null;
  
    editor_id:
      | string
      | null;
  
    primary_category_id:
      | string
      | null;
  
    category_ids:
      string[];
  
    tag_ids:
      string[];
  
    island:
      IslandScope;
  
    featured_image_id:
      | string
      | null;
  
    image_caption:
      | string
      | null;
  
    image_credit:
      | string
      | null;
  
    seo_title:
      | string
      | null;
  
    seo_description:
      | string
      | null;
  
    slug: string;
  
    originally_published_at:
      | string
      | null;
  
    scheduled_at:
      | string
      | null;
  
    created_by:
      | string
      | null;
  
    updated_by:
      | string
      | null;
  
    created_at: string;
  
    updated_at: string;
  }
  
  function mapRevision(
    row: StoryRevisionRow
  ): StoryRevision {
    return {
      id:
        row.id,
  
      storyId:
        row.story_id,
  
      headline:
        row.headline,
  
      subheadline:
        row.subheadline,
  
      summary:
        row.summary,
  
      body:
        row.body,
  
      language:
        row.language,
  
      status:
        row.status,
  
      accessLevel:
        row.access_level,
  
      authorId:
        row.author_id,
  
      editorId:
        row.editor_id,
  
      primaryCategoryId:
        row.primary_category_id,
  
      categoryIds:
        row.category_ids ?? [],
  
      tagIds:
        row.tag_ids ?? [],
  
      island:
        row.island,
  
      featuredImageId:
        row.featured_image_id,
  
      imageCaption:
        row.image_caption,
  
      imageCredit:
        row.image_credit,
  
      seoTitle:
        row.seo_title,
  
      seoDescription:
        row.seo_description,
  
      slug:
        row.slug,
  
      originallyPublishedAt:
        row.originally_published_at,
  
      scheduledAt:
        row.scheduled_at,
  
      createdBy:
        row.created_by,
  
      updatedBy:
        row.updated_by,
  
      createdAt:
        row.created_at,
  
      updatedAt:
        row.updated_at,
    };
  }
  
  /**
   * Returns the active unpublished revision for a story.
   *
   * A story can only have one active revision because
   * story_revisions.story_id is unique.
   */
  export async function getStoryRevision(
    storyId: string
  ): Promise<
    StoryRevision | null
  > {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'story_revisions'
      )
      .select('*')
      .eq(
        'story_id',
        storyId
      )
      .maybeSingle();
  
    if (error) {
      console.error(
        'Unable to fetch story revision:',
        error
      );
  
      throw new Error(
        `Unable to fetch story revision: ${error.message}`
      );
    }
  
    if (!data) {
      return null;
    }
  
    return mapRevision(
      data as StoryRevisionRow
    );
  }
  
  /**
   * Creates or updates the unpublished revision.
   *
   * Important:
   * this function NEVER modifies public.stories.
   */
  export async function saveStoryRevision(
    storyId: string,
    input:
      SaveStoryRevisionInput
  ): Promise<StoryRevision> {
    const supabase =
      await getDataClient();
  
    const revisionData = {
      story_id:
        storyId,
  
      headline:
        input.headline,
  
      subheadline:
        input.subheadline,
  
      summary:
        input.summary,
  
      body:
        input.body,
  
      language:
        input.language,
  
      status:
        input.status ??
        'draft',
  
      access_level:
        input.accessLevel,
  
      author_id:
        input.authorId,
  
      editor_id:
        input.editorId,
  
      primary_category_id:
        input.primaryCategoryId,
  
      category_ids:
        input.categoryIds,
  
      tag_ids:
        input.tagIds,
  
      island:
        input.island,
  
      featured_image_id:
        input.featuredImageId,
  
      image_caption:
        input.imageCaption,
  
      image_credit:
        input.imageCredit,
  
      seo_title:
        input.seoTitle,
  
      seo_description:
        input.seoDescription,
  
      slug:
        input.slug,
  
      originally_published_at:
        input.originallyPublishedAt,
  
      scheduled_at:
        input.scheduledAt,
  
      updated_by:
        input.userId,
    };
  
    const {
      data:
        existingRevision,
      error:
        existingError,
    } = await supabase
      .from(
        'story_revisions'
      )
      .select(
        'id, created_by'
      )
      .eq(
        'story_id',
        storyId
      )
      .maybeSingle();
  
    if (existingError) {
      console.error(
        'Unable to read existing story revision:',
        existingError
      );
  
      throw new Error(
        `Unable to read story revision: ${existingError.message}`
      );
    }
  
    if (existingRevision) {
      const {
        data,
        error,
      } = await supabase
        .from(
          'story_revisions'
        )
        .update(
          revisionData
        )
        .eq(
          'story_id',
          storyId
        )
        .select('*')
        .single();
  
      if (error) {
        console.error(
          'Unable to update story revision:',
          error
        );
  
        throw new Error(
          `Unable to update story revision: ${error.message}`
        );
      }
  
      return mapRevision(
        data as StoryRevisionRow
      );
    }
  
    const {
      data,
      error,
    } = await supabase
      .from(
        'story_revisions'
      )
      .insert({
        ...revisionData,
  
        created_by:
          input.userId,
      })
      .select('*')
      .single();
  
    if (error) {
      console.error(
        'Unable to create story revision:',
        error
      );
  
      throw new Error(
        `Unable to create story revision: ${error.message}`
      );
    }
  
    return mapRevision(
      data as StoryRevisionRow
    );
  }
  
  /**
   * Removes all unpublished changes.
   *
   * The currently published story remains untouched.
   */
  export async function discardStoryRevision(
    storyId: string
  ): Promise<void> {
    const supabase =
      await getDataClient();
  
    const {
      error,
    } = await supabase
      .from(
        'story_revisions'
      )
      .delete()
      .eq(
        'story_id',
        storyId
      );
  
    if (error) {
      console.error(
        'Unable to discard story revision:',
        error
      );
  
      throw new Error(
        `Unable to discard story revision: ${error.message}`
      );
    }
  }
  
  /**
   * Publishes the active revision.
   *
   * The current published story remains live until
   * this function is explicitly called.
   *
   * Once successful:
   * 1. the revision is copied into stories
   * 2. story categories are replaced
   * 3. story tags are replaced
   * 4. the revision is removed
   */
  export async function publishStoryRevision(
    storyId: string,
    userId: string
  ): Promise<void> {
    const supabase =
      await getDataClient();
  
    const revision =
      await getStoryRevision(
        storyId
      );
  
    if (!revision) {
      throw new Error(
        'There are no unpublished changes to publish.'
      );
    }
  
    const {
      data:
        currentStory,
      error:
        currentStoryError,
    } = await supabase
      .from('stories')
      .select(
        'published_at'
      )
      .eq(
        'id',
        storyId
      )
      .maybeSingle();
  
    if (
      currentStoryError
    ) {
      console.error(
        'Unable to read currently published story:',
        currentStoryError
      );
  
      throw new Error(
        `Unable to read published story: ${currentStoryError.message}`
      );
    }
  
    if (!currentStory) {
      throw new Error(
        'Published story could not be found.'
      );
    }
  
    const existingPublishedAt =
      (
        currentStory as {
          published_at:
            | string
            | null;
        }
      ).published_at;
  
    /**
     * Publishing an update should preserve the article's
     * original West Island Times publication timestamp.
     *
     * updated_at will reflect the newly published revision.
     */
    const {
      error:
        storyUpdateError,
    } = await supabase
      .from('stories')
      .update({
        headline:
          revision.headline,
  
        subheadline:
          revision.subheadline,
  
        summary:
          revision.summary,
  
        body:
          revision.body,
  
        language:
          revision.language,
  
        status:
          'published',
  
        access_level:
          revision.accessLevel,
  
        author_id:
          revision.authorId,
  
        editor_id:
          revision.editorId,
  
        primary_category_id:
          revision.primaryCategoryId,
  
        island:
          revision.island,
  
        featured_image_id:
          revision.featuredImageId,
  
        image_caption:
          revision.imageCaption,
  
        image_credit:
          revision.imageCredit,
  
        seo_title:
          revision.seoTitle,
  
        seo_description:
          revision.seoDescription,
  
        slug:
          revision.slug,
  
        originally_published_at:
          revision.originallyPublishedAt,
  
        scheduled_at:
          null,
  
        published_at:
          existingPublishedAt ??
          new Date()
            .toISOString(),
  
        updated_by:
          userId,
      })
      .eq(
        'id',
        storyId
      );
  
    if (
      storyUpdateError
    ) {
      console.error(
        'Unable to publish story revision:',
        storyUpdateError
      );
  
      throw new Error(
        `Unable to publish story revision: ${storyUpdateError.message}`
      );
    }
  
    // --------------------------------------------------
    // Replace story categories
    // --------------------------------------------------
  
    const {
      error:
        categoryDeleteError,
    } = await supabase
      .from(
        'story_categories'
      )
      .delete()
      .eq(
        'story_id',
        storyId
      );
  
    if (
      categoryDeleteError
    ) {
      console.error(
        'Unable to replace revision categories:',
        categoryDeleteError
      );
  
      throw new Error(
        `Unable to replace story categories: ${categoryDeleteError.message}`
      );
    }
  
    if (
      revision.categoryIds
        .length > 0
    ) {
      const categoryRows =
        revision.categoryIds.map(
          (categoryId) => ({
            story_id:
              storyId,
  
            category_id:
              categoryId,
  
            is_primary:
              categoryId ===
              revision.primaryCategoryId,
          })
        );
  
      const {
        error:
          categoryInsertError,
      } = await supabase
        .from(
          'story_categories'
        )
        .insert(
          categoryRows
        );
  
      if (
        categoryInsertError
      ) {
        console.error(
          'Unable to insert revision categories:',
          categoryInsertError
        );
  
        throw new Error(
          `Unable to publish story categories: ${categoryInsertError.message}`
        );
      }
    }
  
    // --------------------------------------------------
    // Replace story tags
    // --------------------------------------------------
  
    const {
      error:
        tagDeleteError,
    } = await supabase
      .from(
        'story_tags'
      )
      .delete()
      .eq(
        'story_id',
        storyId
      );
  
    if (
      tagDeleteError
    ) {
      console.error(
        'Unable to replace revision tags:',
        tagDeleteError
      );
  
      throw new Error(
        `Unable to replace story tags: ${tagDeleteError.message}`
      );
    }
  
    if (
      revision.tagIds
        .length > 0
    ) {
      const tagRows =
        revision.tagIds.map(
          (tagId) => ({
            story_id:
              storyId,
  
            tag_id:
              tagId,
          })
        );
  
      const {
        error:
          tagInsertError,
      } = await supabase
        .from(
          'story_tags'
        )
        .insert(
          tagRows
        );
  
      if (
        tagInsertError
      ) {
        console.error(
          'Unable to insert revision tags:',
          tagInsertError
        );
  
        throw new Error(
          `Unable to publish story tags: ${tagInsertError.message}`
        );
      }
    }
  
    // --------------------------------------------------
    // Preserve a version snapshot
    // --------------------------------------------------
  
    const {
      error:
        versionError,
    } = await supabase
      .from(
        'story_versions'
      )
      .insert({
        story_id:
          storyId,
  
        headline:
          revision.headline,
  
        subheadline:
          revision.subheadline,
  
        summary:
          revision.summary,
  
        body:
          revision.body,
  
        author_id:
          revision.authorId,
  
        editor_id:
          revision.editorId,
  
        language:
          revision.language,
  
        primary_category_id:
          revision.primaryCategoryId,
  
        created_by:
          userId,
      });
  
    if (versionError) {
      console.error(
        'Unable to create published revision version:',
        versionError
      );
  
      /*
       * The article itself is already successfully
       * published at this point, so version-history
       * failure should not destroy the revision yet.
       */
      throw new Error(
        `Revision published, but version history could not be saved: ${versionError.message}`
      );
    }
  
    // --------------------------------------------------
    // Remove successfully published revision
    // --------------------------------------------------
  
    await discardStoryRevision(
      storyId
    );
  }