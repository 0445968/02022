import {readReaderJson,ReaderWriteError} from '@/lib/permissions/reader-write-http';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/session';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';
import { PRIVATE_DRAFT_EXTENSIONS } from '@/lib/services/private-media';

const APPROVED_RIGHTS = new Set([
  'owned','staff_created','licensed','public_domain','creative_commons'
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVIEW_LEASE_MS=15*60*1000;
type ReviewInput={
  rightsStatus:string;rightsNotes:string;licenseName:string|null;
  credit:string|null;licenseExpiresAt:string|null;
  altText:string;title:string|null;
};
function readReview(value:unknown):ReviewInput|null {
  if (!value || typeof value!=='object' || Array.isArray(value)) return null;
  const b=value as Record<string,unknown>;
  if (b.confirmRights!==true || typeof b.rightsStatus!=='string'
    || !APPROVED_RIGHTS.has(b.rightsStatus)) return null;
  if (typeof b.rightsNotes!=='string'
    || b.rightsNotes.trim().length<10 || b.rightsNotes.length>4000) return null;
  const optional=(key:string,limit:number):string|null|undefined=>{
    const raw=b[key];
    if (raw===undefined || raw===null || raw==='') return null;
    return typeof raw==='string' && raw.trim().length<=limit ? raw.trim() : undefined;
  };
  const licenseName=optional('licenseName',250);
  const credit=optional('credit',350);
  const altText=optional('altText',350);
  const title=optional('title',250);
  const expiry=optional('licenseExpiresAt',64);
  if ([licenseName,credit,altText,title,expiry].some(v=>v===undefined))return null;
  if (['licensed','creative_commons'].includes(b.rightsStatus)
    && (!licenseName || !credit)) return null;
  if (expiry && (!Number.isFinite(Date.parse(expiry)) || Date.parse(expiry)<=Date.now())) {
    return null;
  }
  return {
    rightsStatus:b.rightsStatus, rightsNotes:b.rightsNotes.trim(),
    licenseName:licenseName??null, credit:credit??null,
    licenseExpiresAt:expiry??null, altText:altText??'',
    title:title??null
  };
}
async function digest(blob:Blob):Promise<string> {
  return createHash('sha256')
    .update(new Uint8Array(await blob.arrayBuffer()))
    .digest('hex');
}

export async function POST(request:Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  if (!privateDraftMediaEnabled() || isDevAuthBypass()) {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  if (!UUID.test(params.id))return NextResponse.json({error:'Not found'},{status:404});
  const user=await getCurrentUser();
  if (!user || !(
      (await resolveStaffPermissionOnServer('media.approve')).allowed
      && (await resolveStaffPermissionOnServer('media.edit_all')).allowed
      && (await resolveStaffPermissionOnServer('media.upload')).allowed
      && (await resolveStaffPermissionOnServer('media.view_all')).allowed
    )) {
    return NextResponse.json({error:'A media publisher grant is required'},{status:403});
  }

  let raw:unknown;
  try {raw=await readReaderJson(request);}
  catch(error){return NextResponse.json({error:'Invalid request'},{status:error instanceof ReaderWriteError?error.status:400});}
  const input=readReview(raw);
  if (!input)return NextResponse.json({error:'Explicit verified media rights and credit are required'},{status:400});
  const client=await getDataClient() as unknown as SupabaseClient;

  // Read via the caller's current RLS scope. No service-role client or
  // supplied reviewer/owner is trusted.
  const {data:draft,error:readError}=await client.from('media_private_drafts')
    .select('*').eq('id',params.id).maybeSingle();
  if (readError)return NextResponse.json({error:'Private draft unavailable'},{status:500});
  if (!draft)return NextResponse.json({error:'Draft not found'},{status:404});
  if (draft.state==='published') {
    return NextResponse.json({state:'published',mediaId:draft.published_media_id},
      {headers:{'Cache-Control':'no-store'}});
  }
  if (draft.state==='rejected') {
    return NextResponse.json({error:'This media draft was rejected'},{status:409});
  }
  if (!draft.source_sha256 || !/^[0-9a-f]{64}$/.test(draft.source_sha256)) {
    return NextResponse.json({error:'Draft requires a verified original file fingerprint'},{status:409});
  }

  const extension=PRIVATE_DRAFT_EXTENSIONS[draft.mime_type];
  if (!extension || draft.bucket_id!=='media-drafts') {
    return NextResponse.json({error:'Invalid private source'},{status:409});
  }
  const destPath=`approved/${draft.id}.${extension}`;
  const isRetry=draft.state==='failed' || draft.state==='publishing';
  if (isRetry) {
    if (draft.reviewed_by!==user.id || draft.publication_path!==destPath) {
      return NextResponse.json({error:'Existing review is owned by another reviewer'},{status:409});
    }
    if (draft.state==='publishing'
      && (!draft.publication_started_at
        || Date.parse(draft.publication_started_at) > Date.now()-REVIEW_LEASE_MS)) {
      return NextResponse.json({error:'Another promotion is in progress'},{status:409});
    }
    // Rights decisions are immutable after the first approval attempt.
    if (draft.rights_status!==input.rightsStatus || draft.rights_notes!==input.rightsNotes
      || (draft.license_name??null)!==input.licenseName
      || (draft.credit??null)!==input.credit
      || (draft.license_expires_at??null)!==input.licenseExpiresAt) {
      return NextResponse.json({error:'Retry must retain original rights decision'},{status:409});
    }
  }

  // Full source fingerprint is validated BEFORE any review state or public
  // Storage mutation. Hashing also detects tampered/corrupt private uploads.
  const {data:sourceBlob,error:sourceError}=await client.storage
    .from('media-drafts').download(draft.storage_path);
  if (sourceError || !sourceBlob) {
    return NextResponse.json({error:'Private original could not be verified'},{status:409});
  }
  if (sourceBlob.size!==draft.file_size_bytes
    || (await digest(sourceBlob))!==draft.source_sha256) {
    return NextResponse.json({error:'Private file integrity check failed'},{status:409});
  }

  const now=new Date().toISOString();
  let claim=client.from('media_private_drafts').update({
    state:'publishing',
    reviewed_by:user.id,
    reviewed_at:isRetry?draft.reviewed_at:now,
    rights_status:input.rightsStatus,
    rights_notes:input.rightsNotes,
    license_name:input.licenseName,
    credit:input.credit,
    license_expires_at:input.licenseExpiresAt,
    embargo_until:null,
    publication_path:destPath,
    publication_started_at:now,
    attempt_count:(draft.attempt_count??0)+1,
    last_error:null
  }).eq('id',draft.id).eq('state',draft.state)
    .eq('attempt_count',draft.attempt_count??0);
  if (draft.state==='publishing')claim=claim.eq('publication_started_at',draft.publication_started_at);
  const {data:claimed,error:claimError}=await claim.select('id,state').maybeSingle();
  if (claimError || !claimed) {
    return NextResponse.json({error:'Review already claimed or denied by policy'},{status:409});
  }

  try {
    // Cross-bucket copy uses the viewer's JWT: private SELECT and narrow
    // ct02j public INSERT policy. This does not move/delete the original.
    // A retry may encounter a pre-existing deterministic destination;
    // NEVER overwrite it, and verify SHA-256 independently either way.
    const {error:copyError}=await client.storage.from('media-drafts')
      .copy(draft.storage_path,destPath,{destinationBucket:'media'});
    const {data:publicBlob,error:publicReadError}=await client.storage
      .from('media').download(destPath);
    if (publicReadError || !publicBlob
      || publicBlob.size!==draft.file_size_bytes
      || (await digest(publicBlob))!==draft.source_sha256) {
      throw new Error(copyError ? 'copy_failed' : 'destination_integrity_failed');
    }

    const publicUrl=client.storage.from('media').getPublicUrl(destPath).data.publicUrl;
    if (!publicUrl)throw new Error('public_url_unavailable');

    // A duplicate destination/asset can be safely recovered on retry only
    // after verification of its path, source hash, owner and rights decision.
    const {data:existing,error:existingError}=await client.from('media_assets')
      .select('id,status,uploaded_by,approved_by,rights_status,url,mime_type')
      .eq('storage_path',destPath).maybeSingle();
    if (existingError)throw new Error('media_lookup_failed');
    if (existing && (existing.uploaded_by!==user.id
      || existing.rights_status!==input.rightsStatus
      || existing.url!==publicUrl || existing.mime_type!==draft.mime_type)) {
      throw new Error('public_media_record_conflict');
    }
    let mediaId:string;
    if (existing) {
      mediaId=existing.id;
    } else {
      const {data:created,error:createError}=await client.from('media_assets')
        .insert({
          url:publicUrl,storage_path:destPath,file_name:draft.file_name,
          original_file_name:draft.file_name,mime_type:draft.mime_type,
          file_size:draft.file_size_bytes,asset_type:'image',uploaded_by:user.id,
          last_edited_by:user.id,status:'draft',rights_status:input.rightsStatus,
          rights_notes:input.rightsNotes,license_name:input.licenseName,
          license_expires_at:input.licenseExpiresAt,credit:input.credit,
          alt_text:input.altText,title:input.title
        }).select('id').single();
      if (createError || !created)throw new Error('catalog_insert_failed');
      mediaId=created.id;
    }

    if (!existing || existing.status!=='approved') {
      const {data:approved,error:approveError}=await client.from('media_assets')
        .update({
          status:'approved',approved_by:user.id,approved_at:new Date().toISOString(),
          last_edited_by:user.id
        }).eq('id',mediaId).select('id').maybeSingle();
      if (approveError || !approved)throw new Error('catalog_approval_failed');
    } else if (existing.approved_by!==user.id) {
      throw new Error('approval_actor_conflict');
    }

    const {data:finished,error:finishError}=await client.from('media_private_drafts')
      .update({state:'published',published_media_id:mediaId,last_error:null})
      .eq('id',draft.id).eq('state','publishing').eq('reviewed_by',user.id)
      .select('id,state').maybeSingle();
    if (finishError || !finished)throw new Error('review_finalization_failed');
    return NextResponse.json({state:'published',mediaId,publicUrl},
      {headers:{'Cache-Control':'private, no-store, max-age=0'}});
  } catch (error) {
    // PostgreSQL and Storage are NOT one atomic transaction. Leave bytes
    // intact for safe reconciliation: a retry verifies the existing object
    // and reuses the exact same destination instead of overwriting files.
    console.error('Private media promotion requires retry:',
      error instanceof Error ? error.message : 'unknown');
    await client.from('media_private_drafts')
      .update({state:'failed',last_error:'Promotion needs a verified retry'})
      .eq('id',draft.id).eq('state','publishing').eq('reviewed_by',user.id);
    return NextResponse.json({error:'Promotion incomplete; reviewer may retry safely'},
      {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
