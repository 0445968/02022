import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { createMediaAssetRecord, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/media';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !(user.profile?.isAuthor || user.profile?.isEditor)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const altText = (formData.get('altText') as string) ?? '';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const supabase = await getDataClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);

  // Get image dimensions (from the client if provided, otherwise null)
  const width = formData.get('width') ? parseInt(formData.get('width') as string, 10) : null;
  const height = formData.get('height') ? parseInt(formData.get('height') as string, 10) : null;

  // Create media_assets record
  const media = await createMediaAssetRecord({
    url: urlData.publicUrl,
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    width,
    height,
    fileSize: file.size,
    altText,
    uploadedBy: user.id,
  });

  if (!media) {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }

  return NextResponse.json(media);
}
