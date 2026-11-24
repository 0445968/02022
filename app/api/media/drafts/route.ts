import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/session';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { mayUploadMedia } from '@/lib/permissions/media-route-gates';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/media-config';
import { hasExpectedImageSignature, PRIVATE_DRAFT_EXTENSIONS } from '@/lib/services/private-media';

export async function POST(request: Request) {
  // No public fallback, demo bypass, secret-service client or legacy editor
  // privilege in this private workflow. Two independent server-only flags.
  if (!privateDraftMediaEnabled() || isDevAuthBypass()) {
    return NextResponse.json({error:'Private draft uploads are not enabled'}, {status:404});
  }
  const user = await getCurrentUser();
  if (!user || !(await mayUploadMedia(user))) {
    return NextResponse.json({error:'Forbidden'}, {status:403});
  }
  let body: FormData;
  try { body=await request.formData(); }
  catch { return NextResponse.json({error:'Invalid form data'},{status:400}); }
  const candidate=body.get('file');
  if (!(candidate instanceof File)) {
    return NextResponse.json({error:'A file is required'},{status:400});
  }
  const file=candidate;
  if (file.size<1 || file.size>MAX_FILE_SIZE
    || !ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return NextResponse.json({error:'Invalid file type or size'},{status:400});
  }
  const prefix=new Uint8Array(await file.slice(0,64).arrayBuffer());
  if (!hasExpectedImageSignature(file.type,prefix)) {
    return NextResponse.json({error:'File contents do not match its type'},{status:400});
  }
  const extension=PRIVATE_DRAFT_EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({error:'Unsupported file'},{status:400});
  const name=file.name.trim().slice(0,255);
  if (!name) return NextResponse.json({error:'File name required'},{status:400});

  const path=`drafts/${user.id}/${crypto.randomUUID()}.${extension}`;
  // This cookie-bound client carries the verified account's Supabase JWT.
  // No service-role key, no public URL, and no automatic publish/promotion.
  const supabase=await getDataClient() as unknown as SupabaseClient;
  const {error:storageError}=await supabase.storage.from('media-drafts').upload(
    path,file,{contentType:file.type,cacheControl:'0',upsert:false}
  );
  if (storageError) {
    console.error('Private media upload failed:',storageError.message);
    return NextResponse.json({error:'Private upload failed'},{status:500});
  }

  const {data:record,error:metadataError}=await supabase
    .from('media_private_drafts')
    .insert({
      uploaded_by:user.id,
      bucket_id:'media-drafts',
      storage_path:path,
      file_name:name,
      mime_type:file.type,
      file_size_bytes:file.size
    })
    .select('id,created_at')
    .single();

  if (metadataError || !record) {
    const {error:cleanupError}=await supabase.storage.from('media-drafts').remove([path]);
    if (cleanupError) console.error('Unlinked private upload needs cleanup:',cleanupError.message);
    return NextResponse.json({error:'Unable to record private draft'},{status:500});
  }
  return NextResponse.json({
    draft: {
      id:record.id,
      fileName:name,
      mimeType:file.type,
      fileSizeBytes:file.size,
      createdAt:record.created_at
    }
  },{status:201,headers:{'Cache-Control':'no-store'}});
}
