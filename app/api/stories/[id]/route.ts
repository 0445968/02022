import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { canEditStory, canChangeStatus } from '@/lib/permissions/stories';
import { getStoryForEditing, updateStory, syncStoryCategories, syncStoryTags } from '@/lib/services/stories';
import { findOrCreateTag } from '@/lib/services/taxonomy';
import type { StoryStatus } from '@/lib/db/database.types';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const story = await getStoryForEditing(params.id);
  if (!story) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canEditStory(user, story.author?.id ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    headline?: string;
    subheadline?: string | null;
    summary?: string | null;
    body?: Record<string, unknown>;
    language?: 'en' | 'es';
    status?: StoryStatus;
    accessLevel?: 'public' | 'registered' | 'subscriber' | 'premium';
    authorId?: string | null;
    editorId?: string | null;
    primaryCategoryId?: string | null;
    island?: 'san_andres' | 'old_providence' | 'saint_catalina' | 'archipelago' | 'none';
    featuredImageId?: string | null;
    imageCaption?: string | null;
    imageCredit?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publishedAt?: string | null;
    scheduledAt?: string | null;
    slug?: string;
    categoryIds?: string[];
    tagIds?: string[];
    newTags?: string[];
    createVersion?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Permission check: status changes
  if (body.status && body.status !== story.status) {
    if (!canChangeStatus(user, body.status)) {
      return NextResponse.json({ error: 'Cannot change to this status' }, { status: 403 });
    }
  }

  // Handle new tags
  const allTagIds = [...(body.tagIds ?? [])];
  if (body.newTags && body.newTags.length > 0) {
    for (const tagName of body.newTags) {
      const tag = await findOrCreateTag(tagName);
      if (tag && !allTagIds.includes(tag.id)) {
        allTagIds.push(tag.id);
      }
    }
  }

  try {
  await updateStory(params.id, {
    headline: body.headline,
    subheadline: body.subheadline,
    summary: body.summary,
    body: body.body,
    language: body.language,
    status: body.status,
    accessLevel: body.accessLevel,
    authorId: body.authorId,
    editorId: body.editorId,
    primaryCategoryId: body.primaryCategoryId,
    island: body.island,
    featuredImageId: body.featuredImageId,
    imageCaption: body.imageCaption,
    imageCredit: body.imageCredit,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    publishedAt: body.publishedAt,
    scheduledAt: body.scheduledAt,
    slug: body.slug,
    updatedBy: user.id,
    createVersion:
      body.createVersion ??
      false,
  });
} catch (error) {
  console.error(
    'PUT story failed:',
    error
  );

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update story',
    },
    {
      status: 500,
    }
  );
}

  // Sync categories and tags if provided
  if (body.categoryIds !== undefined) {
    await syncStoryCategories(params.id, body.categoryIds, body.primaryCategoryId ?? null);
  }
  if (body.tagIds !== undefined || body.newTags !== undefined) {
    await syncStoryTags(params.id, allTagIds);
  }

  return NextResponse.json({ success: true });
}
