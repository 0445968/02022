import { NextResponse } from 'next/server';
import {parsePrivateUploadQuota,validPrivateReservation} from '@/lib/permissions/private-upload-quota';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/session';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { mayUploadMedia, mayListMedia } from '@/lib/permissions/media-route-gates';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';
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
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});
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
  // Digest the actual accepted bytes; promotion verifies both the private
  // source and copied public destination before publishing metadata.
  const sha256=createHash('sha256')
    .update(new Uint8Array(await file.arrayBuffer()))
    .digest('hex');
  if (!hasExpectedImageSignature(file.type,prefix)) {
    return NextResponse.json({error:'File contents do not match its type'},{status:400});
  }
  const extension=PRIVATE_DRAFT_EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({error:'Unsupported file'},{status:400});
  const name=file.name.trim().slice(0,255);
  if (!name) return NextResponse.json({error:'File name required'},{status:400});

  // This cookie-bound client carries the verified account's Supabase JWT.
  // No service-role key, no public URL, and no automatic publish/promotion.
  const supabase=await getDataClient() as unknown as SupabaseClient;
  const {data:{user:fresh},error:authError}=await supabase.auth.getUser();
  if(authError||fresh?.id!==user.id)return NextResponse.json({error:'Forbidden'},{status:403});
  // The immutable DB reservation is required BEFORE any Storage request.
  const {data:path,error:quotaError}=await supabase.rpc('staff_reserve_private_upload',{p_extension:extension});
  if(quotaError){
    return NextResponse.json({error:quotaError.code==='P0001'?'Private upload allowance exhausted':'Private upload allowance unavailable'},{status:quotaError.code==='P0001'?429:quotaError.code==='42501'?403:503,headers:{'Cache-Control':'no-store'}});
  }
  if(!validPrivateReservation(path,user.id,extension))return NextResponse.json({error:'Private upload allowance unavailable'},{status:503});
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
      file_size_bytes:file.size,
      source_sha256:sha256
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

/**
 * Private staging review list. RLS automatically filters to the uploader's
 * own drafts or those a current media reviewer is allowed to see.
 * No private object keys or signed URLs are returned by listing.
 */
export async function GET() {
  if (!privateDraftMediaEnabled() || isDevAuthBypass()) {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  const user=await getCurrentUser();
  if (!user || !(await mayUploadMedia(user) || await mayListMedia(user))) {
    return NextResponse.json({error:'Forbidden'},{status:403});
  }
  const client=await getDataClient() as unknown as SupabaseClient;
  const {data,error}=await client.from('media_private_drafts')
    .select('id,file_name,mime_type,file_size_bytes,created_at,state,reviewed_at,reviewed_by,rights_status,rights_notes,license_name,credit,license_expires_at,review_reason,published_media_id')
    .order('created_at',{ascending:false}).limit(50);
  if (error) {
    console.error('Private media queue unavailable:',error.message);
    return NextResponse.json({error:'Unable to list drafts'},{status:500});
  }
  const canReview=(
    (await resolveStaffPermissionOnServer('media.approve')).allowed
    && (await resolveStaffPermissionOnServer('media.edit_all')).allowed
  );
  let quota=null;
  if(await mayUploadMedia(user)){
    const {data:raw,error:quotaError}=await client.rpc('staff_private_upload_quota');
    if(quotaError)return NextResponse.json({error:'Private upload allowance unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
    try{quota=parsePrivateUploadQuota(raw);}catch{return NextResponse.json({error:'Private upload allowance unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  return NextResponse.json({
    quota,
    drafts:(data??[]).map(item=>({
      id:item.id,fileName:item.file_name,mimeType:item.mime_type,
      fileSizeBytes:item.file_size_bytes,createdAt:item.created_at,
      state:item.state,reviewedAt:item.reviewed_at,rightsStatus:item.rights_status,
      reviewReason:item.review_reason,publishedMediaId:item.published_media_id,
      review:canReview ? {
        reviewedBy:item.reviewed_by,rightsNotes:item.rights_notes,
        licenseName:item.license_name,credit:item.credit,
        licenseExpiresAt:item.license_expires_at
      } : null
    }))
  },{headers:{'Cache-Control':'private, no-store, max-age=0'}});
}
