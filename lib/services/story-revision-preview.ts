import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  import {
    getStoryRevision,
  } from '@/lib/services/story-revisions';

  import {
    getEditorialProfilesByAccountIds,
  } from '@/lib/services/editorial-profiles';
  
  import type {
    Category,
    MediaAsset,
    StoryAuthor,
    StoryCategory,
    StoryEditor,
    StoryTag,
    StoryWithRelations,
  } from '@/types/editorial';
  
  interface BuildRevisionPreviewOptions {
    story:
      StoryWithRelations;
  }
  
  export async function buildRevisionPreviewStory({
    story,
  }: BuildRevisionPreviewOptions): Promise<
    StoryWithRelations | null
  > {
    const revision =
      await getStoryRevision(
        story.id
      );
  
    if (!revision) {
      return null;
    }
  
    const supabase =
      await getDataClient();
  
    // ==================================================
// Resolve editorial identities
// ==================================================
//
// Revision author_id and editor_id still contain account
// IDs. Resolve the separate editorial bylines while keeping
// legacy profile values as a temporary migration fallback.
// ==================================================

const profileIds =
Array.from(
  new Set(
    [
      revision.authorId,
      revision.editorId,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(value)
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
profileIds.length >
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
    profileIds
  );

if (profileError) {
  console.error(
    'Unable to resolve revision staff profiles:',
    profileError
  );

  throw new Error(
    `Unable to resolve revision staff: ${profileError.message}`
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
  profileIds
);

function resolveRevisionIdentity(
accountId:
  | string
  | null
): StoryAuthor | null {
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

const author:
| StoryAuthor
| null =
resolveRevisionIdentity(
  revision.authorId
);

const editor:
| StoryEditor
| null =
resolveRevisionIdentity(
  revision.editorId
);
  
    // ==================================================
    // Resolve categories
    // ==================================================
  
    let primaryCategory:
      | Category
      | null =
      null;
  
    let categories:
      StoryCategory[] =
      [];
  
    const categoryIds =
      Array.from(
        new Set(
          [
            ...(
              revision.categoryIds ??
              []
            ),
  
            revision.primaryCategoryId,
          ].filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
        )
      );
  
    if (
      categoryIds.length > 0
    ) {
      const {
        data:
          categoryRows,
      } =
        await supabase
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
          .in(
            'id',
            categoryIds
          );
  
      const resolvedCategories =
        (
          categoryRows ??
          []
        ).map(
          (
            row
          ): Category => ({
            id:
              row.id,
  
            slug:
              row.slug,
  
            nameEn:
              row.name_en,
  
            nameEs:
              row.name_es,
  
            descriptionEn:
              row.description_en,
  
            descriptionEs:
              row.description_es,
  
            active:
              row.active,
  
            sortOrder:
              row.sort_order,
          })
        );
  
      primaryCategory =
        resolvedCategories.find(
          (category) =>
            category.id ===
            revision.primaryCategoryId
        ) ?? null;
  
      categories =
        resolvedCategories
          .filter(
            (category) =>
              revision.categoryIds.includes(
                category.id
              )
          )
          .map(
            (
              category
            ): StoryCategory => ({
              id:
                category.id,
  
              slug:
                category.slug,
  
              nameEn:
                category.nameEn,
  
              nameEs:
                category.nameEs,
  
              isPrimary:
                category.id ===
                revision.primaryCategoryId,
            })
          );
    }
  
    // ==================================================
    // Resolve tags
    // ==================================================
  
    let tags:
      StoryTag[] =
      [];
  
    if (
      revision.tagIds.length >
      0
    ) {
      const {
        data:
          tagRows,
      } =
        await supabase
          .from(
            'tags'
          )
          .select(
            `
              id,
              slug,
              name
            `
          )
          .in(
            'id',
            revision.tagIds
          );
  
      tags =
        (
          tagRows ??
          []
        ).map(
          (
            row
          ): StoryTag => ({
            id:
              row.id,
  
            slug:
              row.slug,
  
            name:
              row.name,
          })
        );
    }
  
    // ==================================================
    // Resolve featured image
    // ==================================================
  
    let featuredImage:
      | MediaAsset
      | null =
      null;
  
    if (
      revision.featuredImageId
    ) {
      if (
        revision.featuredImageId ===
        story.featuredImage?.id
      ) {
        featuredImage =
          story.featuredImage;
      } else {
        const {
          data:
            mediaRow,
        } =
          await supabase
            .from(
              'media_assets'
            )
            .select(
              `
                id,
                url,
                storage_path,
                file_name,
                mime_type,
                width,
                height,
                file_size,
                alt_text,
                caption,
                credit,
                uploaded_by,
                created_at,
                updated_at
              `
            )
            .eq(
              'id',
              revision.featuredImageId
            )
            .maybeSingle();
  
        if (mediaRow) {
          featuredImage = {
            id:
              mediaRow.id,
  
            url:
              mediaRow.url,
  
            storagePath:
              mediaRow.storage_path,
  
            fileName:
              mediaRow.file_name,
  
            mimeType:
              mediaRow.mime_type,
  
            width:
              mediaRow.width,
  
            height:
              mediaRow.height,
  
            fileSize:
              mediaRow.file_size,
  
            altText:
              mediaRow.alt_text,
  
            caption:
              mediaRow.caption,
  
            credit:
              mediaRow.credit,
  
            uploadedBy:
              mediaRow.uploaded_by,
  
            createdAt:
              mediaRow.created_at,
  
            updatedAt:
              mediaRow.updated_at,
          };
        }
      }
    }
  
    // ==================================================
    // Build preview story
    // ==================================================
  
    return {
      ...story,
  
      slug:
        revision.slug,
  
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
  
      /**
       * Keep the public story's real status.
       *
       * A revision itself is a draft, but the story
       * remains published while the update is pending.
       */
      status:
        story.status,
  
      accessLevel:
        revision.accessLevel,
  
      island:
        revision.island,
  
      author,
  
      editor,
  
      primaryCategory,
  
      categories,
  
      tags,
  
      featuredImage,
  
      imageCaption:
        revision.imageCaption,
  
      imageCredit:
        revision.imageCredit,
  
      seoTitle:
        revision.seoTitle,
  
      seoDescription:
        revision.seoDescription,
  
      originallyPublishedAt:
        revision.originallyPublishedAt,
  
      /**
       * Preserve the actual live publication timestamp.
       * The revision must never redefine it.
       */
      publishedAt:
        story.publishedAt,
  
      scheduledAt:
        revision.scheduledAt,
  
      /**
       * Keep the live timestamps here for now.
       * The comparison UI can expose revision.updatedAt
       * separately later.
       */
      createdAt:
        story.createdAt,
  
      updatedAt:
        story.updatedAt,
    };
  }