import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { mayCreateStory, mayAssignStoryAuthor, mayRestoreStoryVersion, mayEditHomepage, mayPublishHomepage, mayManageBreakingNews, mayManageByline, mayCreateTag } from '@/lib/permissions/editorial-route-gates';
import { createStory } from '@/lib/services/stories';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !(await mayCreateStory(user))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { headline?: string; language?: 'en' | 'es'; authorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Prevent author re-assignment through the create endpoint without the
  // independent story.assign capability. Server user ID is authoritative.
  if (body.authorId && body.authorId !== user.id &&
      !(await mayAssignStoryAuthor(user))) {
    return NextResponse.json({ error: 'Assignment permission required' }, { status: 403 });
  }

  const result = await createStory({
    headline: body.headline,
    language: body.language,
    authorId: body.authorId ?? user.id,
    createdById: user.id,
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }

  return NextResponse.json(result);
}
