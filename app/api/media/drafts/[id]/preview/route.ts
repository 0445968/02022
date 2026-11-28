import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/session';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { mayListMedia } from '@/lib/permissions/media-route-gates';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';

const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const PREVIEW_TTL_SECONDS=60;

export async function GET(_request: Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  if (!privateDraftMediaEnabled() || isDevAuthBypass()) {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  const user=await getCurrentUser();
  if (!user || !(await mayListMedia(user))) {
    return NextResponse.json({error:'Forbidden'},{status:403});
  }
  if (!UUID.test(params.id)) return NextResponse.json({error:'Not found'},{status:404});

  const supabase=await getDataClient() as unknown as SupabaseClient;
  // RLS verifies current actor: only uploader with media.upload or
  // active staff with media.view_all/edit_all can resolve this row.
  const {data:draft,error}=await supabase.from('media_private_drafts')
    .select('bucket_id,storage_path')
    .eq('id',params.id).maybeSingle();
  if (error) return NextResponse.json({error:'Unable to access draft'},{status:500});
  if (!draft || draft.bucket_id!=='media-drafts') {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  // Signed URLs are bearer links valid until expiry even after revocation.
  // Never persist them in the DB, logs, CDN or a public page.
  const {data:signed,error:signError}=await supabase.storage
    .from('media-drafts').createSignedUrl(draft.storage_path,PREVIEW_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({error:'Private preview unavailable'},{status:403});
  }
  return NextResponse.json({
    signedUrl:signed.signedUrl,
    expiresInSeconds:PREVIEW_TTL_SECONDS
  },{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
}
