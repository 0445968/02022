import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';

  import {
    getEditorialProfilesByAccountIds,
  } from '@/lib/services/editorial-profiles';
  
  import type {
    StoryLanguage,
  } from '@/lib/db/database.types';
  
  import type {
    StoryWithRelations,
  } from '@/types/editorial';
  
  interface BuildStoryVersionPreviewOptions {
    story:
      StoryWithRelations;
  
    versionId:
      string;
  }
  
  /**
   * Builds a historical story snapshot suitable for:
   *
   * - version previewing
   * - version-vs-live comparison
   *
   * story_versions only contains a subset of the full
   * story record, so fields that were not historically
   * versioned are inherited from the current live story.
   */
  export async function buildStoryVersionPreview({
    story,
    versionId,
  }: BuildStoryVersionPreviewOptions): Promise<
    StoryWithRelations | null
  > {
    const supabase =
      await getDataClient();
  
    // ==================================================
    // Load historical version
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
          short_title,
          subheadline,
          summary,
          body,
          language,
          author_id,
          editor_id,
          primary_category_id,
          created_at
        `
      )
      .eq(
        'id',
        versionId
      )
      .eq(
        'story_id',
        story.id
      )
      .maybeSingle();
  
    if (
      versionError
    ) {
      console.error(
        'Unable to load historical story version:',
        versionError
      );
  
      return null;
    }
  
    if (!version) {
      return null;
    }
  
    // ==================================================
// Resolve historical editorial identities
// ==================================================
//
// author_id and editor_id are historically stored fields.
// A saved null remains null. Otherwise, resolve the separate
// editorial byline linked to that historical account ID.
// ==================================================

const historicalStaffIds =
Array.from(
  new Set(
    [
      version.author_id,
      version.editor_id,
    ].filter(
      (
        id
      ): id is string =>
        Boolean(id)
    )
  )
);

const legacyProfiles =
new Map<
  string,
  {
    name:
      | string
      | null;

    editorialTitle:
      | string
      | null;
  }
>();

if (
historicalStaffIds.length >
0
) {
const {
  data:
    profileRows,
  error:
    profileError,
} = await supabase
  .from(
    'profiles'
  )
  .select(
    `
      id,
      name,
      editorial_title
    `
  )
  .in(
    'id',
    historicalStaffIds
  );

if (profileError) {
  console.error(
    'Unable to resolve historical staff profiles:',
    profileError
  );

  throw new Error(
    `Unable to resolve historical staff: ${profileError.message}`
  );
}

for (
  const profile of
    profileRows ?? []
) {
  legacyProfiles.set(
    profile.id,
    {
      name:
        profile.name,

      editorialTitle:
        profile
          .editorial_title,
    }
  );
}
}

const editorialProfiles =
await getEditorialProfilesByAccountIds(
  historicalStaffIds
);

function resolveHistoricalIdentity(
accountId:
  | string
  | null
): StoryWithRelations['author'] {
if (!accountId) {
  return null;
}

const editorialProfile =
  editorialProfiles.get(
    accountId
  );

const legacyProfile =
  legacyProfiles.get(
    accountId
  );

return {
  id:
    accountId,

  name:
    editorialProfile
      ?.bylineName ??
    legacyProfile
      ?.name ??
    null,

  editorialTitle:
    editorialProfile
      ?.editorialTitle ??
    legacyProfile
      ?.editorialTitle ??
    null,
};
}

const author =
resolveHistoricalIdentity(
  version.author_id
);

const editor =
resolveHistoricalIdentity(
  version.editor_id
);
  
    // ==================================================
    // Resolve historical primary category
    // ==================================================
  
    let primaryCategory =
      story.primaryCategory;
  
    if (
      version.primary_category_id
    ) {
      const {
        data:
          categoryRow,
      } = await supabase
        .from(
          'categories'
        )
        .select(
          `
            id,
            slug,
            name_en,
            name_es,
            description_en,
            description_es,
            active,
            sort_order
          `
        )
        .eq(
          'id',
          version.primary_category_id
        )
        .maybeSingle();
  
      if (
        categoryRow
      ) {
        primaryCategory = {
          id:
            categoryRow.id,
  
          slug:
            categoryRow.slug,
  
          nameEn:
            categoryRow.name_en,
  
          nameEs:
            categoryRow.name_es,
  
          descriptionEn:
            categoryRow
              .description_en,
  
          descriptionEs:
            categoryRow
              .description_es,
  
          active:
            categoryRow.active,
  
          sortOrder:
            categoryRow
              .sort_order,
        };
      }
    } else {
      primaryCategory =
        null;
    }
  
    // ==================================================
    // Historical category list
    // ==================================================
    //
    // Older story_versions only stored the primary category,
    // not the complete category relationship set.
    //
    // To avoid pretending that current additional categories
    // existed historically, the historical snapshot contains
    // only the saved primary category.
    // ==================================================
  
    const categories =
      primaryCategory
        ? [
            {
              id:
                primaryCategory.id,
  
              slug:
                primaryCategory.slug,
  
              nameEn:
                primaryCategory.nameEn,
  
              nameEs:
                primaryCategory.nameEs,
  
              isPrimary:
                true,
            },
          ]
        : [];
  
    // ==================================================
    // Construct historical snapshot
    // ==================================================
    //
    // Fields absent from story_versions remain inherited
    // from the live story because no historical data exists
    // for them.
    //
    // updatedAt intentionally reflects when this version
    // snapshot was created.
    // ==================================================
  
    return {
      ...story,
  
      headline:
        version.headline,

      shortTitle:
        version.short_title ??
        null,
  
      subheadline:
        version.subheadline,
  
      summary:
        version.summary,
  
      body:
        (
          version.body as Record<
            string,
            unknown
          >
        ) ?? {
          type:
            'doc',
  
          content: [
            {
              type:
                'paragraph',
            },
          ],
        },
  
      language:
        (
          version.language as
            StoryLanguage
        ) ??
        story.language,
  
      author,
  
      editor,
  
      primaryCategory,
  
      categories,
  
      /**
       * Tags were not historically stored in
       * story_versions, so keep the live tags.
       */
      tags:
        story.tags,
  
      /**
       * These fields were also not versioned historically.
       */
      featuredImage:
        story.featuredImage,
  
      imageCaption:
        story.imageCaption,
  
      imageCredit:
        story.imageCredit,
  
      accessLevel:
        story.accessLevel,
  
      island:
        story.island,
  
      slug:
        story.slug,
  
      seoTitle:
        story.seoTitle,
  
      seoDescription:
        story.seoDescription,
  
      originallyPublishedAt:
        story.originallyPublishedAt,
  
      publishedAt:
        story.publishedAt,
  
      scheduledAt:
        story.scheduledAt,
  
      /**
       * Keep the story's creation date, but use the
       * historical snapshot creation time as its
       * comparison "updated" date.
       */
      createdAt:
        story.createdAt,
  
      updatedAt:
        version.created_at,
    };
  }