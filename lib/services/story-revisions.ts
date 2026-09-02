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

  export async function restoreVersionToRevision(
    storyId: string,
    versionId: string,
    userId: string
  ): Promise<StoryRevision> {
    const supabase =
      await getDataClient();
  
    // ==================================================
    // Load the historical version
    // ==================================================
  
    const {
      data:
        version,
      error:
        versionError,
    } = await supabase
      .from(
        'story_versions'
      )
      .select(
        `
          id,
          story_id,
          headline,
          subheadline,
          summary,
          body,
          language,
          author_id,
          editor_id,
          primary_category_id
        `
      )
      .eq(
        'id',
        versionId
      )
      .eq(
        'story_id',
        storyId
      )
      .maybeSingle();
  
    if (
      versionError
    ) {
      console.error(
        'Unable to load story version for revision restore:',
        versionError
      );
  
      throw new Error(
        `Unable to load story version: ${versionError.message}`
      );
    }
  
    if (!version) {
      throw new Error(
        'Story version could not be found.'
      );
    }
  
    // ==================================================
    // Load current live story
    // ==================================================
    //
    // story_versions only stores the historical editorial
    // content fields.
    //
    // Metadata not stored in the old version snapshot must
    // remain based on the current published story.
    // ==================================================
  
    const {
      data:
        currentStory,
      error:
        currentStoryError,
    } = await supabase
      .from(
        'stories'
      )
      .select(
        `
          id,
          slug,
          status,
          access_level,
          island,
          featured_image_id,
          image_caption,
          image_credit,
          seo_title,
          seo_description,
          originally_published_at,
          scheduled_at
        `
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
        'Unable to load current story for revision restore:',
        currentStoryError
      );
  
      throw new Error(
        `Unable to load current story: ${currentStoryError.message}`
      );
    }
  
    if (!currentStory) {
      throw new Error(
        'Story could not be found.'
      );
    }
  
    if (
      currentStory.status !==
      'published'
    ) {
      throw new Error(
        'Only published stories should restore historical versions into a revision.'
      );
    }
  
    // ==================================================
    // Load current categories
    // ==================================================
  
    const {
      data:
        categoryRows,
      error:
        categoryError,
    } = await supabase
      .from(
        'story_categories'
      )
      .select(
        `
          category_id,
          is_primary
        `
      )
      .eq(
        'story_id',
        storyId
      );
  
    if (
      categoryError
    ) {
      console.error(
        'Unable to load current story categories:',
        categoryError
      );
  
      throw new Error(
        `Unable to load story categories: ${categoryError.message}`
      );
    }
  
    const categoryIds =
      (
        categoryRows ??
        []
      ).map(
        (
          row
        ) =>
          row.category_id
      );
  
    // ==================================================
    // Load current tags
    // ==================================================
  
    const {
      data:
        tagRows,
      error:
        tagError,
    } = await supabase
      .from(
        'story_tags'
      )
      .select(
        'tag_id'
      )
      .eq(
        'story_id',
        storyId
      );
  
    if (
      tagError
    ) {
      console.error(
        'Unable to load current story tags:',
        tagError
      );
  
      throw new Error(
        `Unable to load story tags: ${tagError.message}`
      );
    }
  
    const tagIds =
      (
        tagRows ??
        []
      ).map(
        (
          row
        ) =>
          row.tag_id
      );
  
    // ==================================================
    // Determine restored primary category
    // ==================================================
    //
    // Historical versions DO remember the primary category.
    // If that old category is not already in the current
    // category list, add it so the revision stays coherent.
    // ==================================================
  
    const restoredPrimaryCategoryId =
      version.primary_category_id;
  
    if (
      restoredPrimaryCategoryId &&
      !categoryIds.includes(
        restoredPrimaryCategoryId
      )
    ) {
      categoryIds.push(
        restoredPrimaryCategoryId
      );
    }
  
    // ==================================================
    // Save historical content as unpublished revision
    // ==================================================
  
    return saveStoryRevision(
      storyId,
      {
        headline:
          version.headline,
  
        subheadline:
          version.subheadline,
  
        summary:
          version.summary,
  
        body:
          version.body,
  
        language:
          version.language,
  
        status:
          'draft',
  
        accessLevel:
          currentStory.access_level,
  
          authorId:
          version.author_id,
        
        editorId:
          version.editor_id,
  
        primaryCategoryId:
          restoredPrimaryCategoryId,
  
        categoryIds,
  
        tagIds,
  
        island:
          currentStory.island,
  
        featuredImageId:
          currentStory.featured_image_id,
  
        imageCaption:
          currentStory.image_caption,
  
        imageCredit:
          currentStory.image_credit,
  
        seoTitle:
          currentStory.seo_title,
  
        seoDescription:
          currentStory.seo_description,
  
        slug:
          currentStory.slug,
  
        originallyPublishedAt:
          currentStory.originally_published_at,
  
        /**
         * Restoring history creates an unpublished
         * revision; it should not automatically schedule it.
         */
        scheduledAt:
          null,
  
        userId,
      }
    );
  }

  /**
 * Atomically publishes the active revision.
 *
 * PostgreSQL performs the complete operation in one
 * transaction:
 *
 * 1. preserve the current live story in story_versions
 * 2. publish the revision into stories
 * 3. replace category relationships
 * 4. replace tag relationships
 * 5. remove the published revision
 *
 * If any step fails, PostgreSQL rolls back every step.
 */
export async function publishStoryRevision(
  storyId: string,
  userId: string
): Promise<void> {
  const supabase =
    await getDataClient();

  const {
    error,
  } = await supabase.rpc(
    'publish_story_revision',
    {
      p_story_id:
        storyId,

      p_user_id:
        userId,
    }
  );

  if (error) {
    console.error(
      'Unable to publish story revision atomically:',
      error
    );

    throw new Error(
      `Unable to publish story revision: ${error.message}`
    );
  }
}