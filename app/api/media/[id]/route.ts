import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { updateMediaAsset } from '@/lib/services/media';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();

  if (!user || !(user.profile?.isAuthor || user.profile?.isEditor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { altText?: string; caption?: string | null; credit?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const success = await updateMediaAsset(params.id, body);

  if (!success) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();

  if (!user || !user.profile?.isEditor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get('storagePath') ?? '';

  const { deleteMediaAsset } = await import('@/lib/services/media');
  const success = await deleteMediaAsset(params.id, storagePath);

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
