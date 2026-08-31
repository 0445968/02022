import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { canCreateStory } from '@/lib/permissions/stories';
import { createStory } from '@/lib/services/stories';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canCreateStory(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { headline?: string; language?: 'en' | 'es'; authorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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
