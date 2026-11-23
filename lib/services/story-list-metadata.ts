/**
 * Pure, page-scoped composition logic for the Newsroom Stories list.
 * PostgREST/RLS determines which revision rows may be read by each staff user.
 */
export interface StoryListImageMeta {
  id: string;
  url: string | null;
  alt_text: string | null;
}

export interface StoryListRevisionMeta {
  story_id: string;
  updated_at: string | null;
}

export function enrichStoryListItems<
  T extends { id: string; status: string; featuredImageId: string | null }
>(
  items: T[],
  images: StoryListImageMeta[],
  visibleRevisions: StoryListRevisionMeta[]
): Array<T & {
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  hasUnpublishedChanges: boolean;
  unpublishedChangesUpdatedAt: string | null;
}> {
  const imageById = new Map(images.map((image) => [image.id, image]));
  const revisionByStoryId = new Map(visibleRevisions.map((revision) => [revision.story_id, revision]));

  return items.map((story) => {
    const image = story.featuredImageId ? imageById.get(story.featuredImageId) : undefined;
    // A never-published story is already a Draft, not a second active publication revision.
    // Stored status is never changed by this display-only composition.
    const revision = story.status === 'published' ? revisionByStoryId.get(story.id) : undefined;
    return {
      ...story,
      featuredImageUrl: image?.url ?? null,
      featuredImageAlt: image?.alt_text ?? null,
      hasUnpublishedChanges: Boolean(revision),
      unpublishedChangesUpdatedAt: revision?.updated_at ?? null,
    };
  });
}
