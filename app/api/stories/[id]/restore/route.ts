import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { restoreStoryVersion } from '@/lib/services/stories';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only editors can restore versions
  if (!user.profile?.isEditor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { versionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId required' }, { status: 400 });
  }

  const success = await restoreStoryVersion(body.versionId, user.id);

  if (!success) {
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
