import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getTags, findOrCreateTag } from '@/lib/services/taxonomy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const tags = await getTags(search);
  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(user.profile?.isAuthor || user.profile?.isEditor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const tag = await findOrCreateTag(body.name);
  if (!tag) {
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }

  return NextResponse.json(tag);
}
