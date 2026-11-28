import {readReaderJson,ReaderWriteError} from '@/lib/permissions/reader-write-http';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/session';
import { isDevAuthBypass } from '@/lib/db/supabase-data';
import { getDataClient } from '@/lib/db/supabase-data-access';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';

export async function POST(request:Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  if (!privateDraftMediaEnabled() || isDevAuthBypass()) {
    return NextResponse.json({error:'Not found'},{status:404});
  }
  const user=await getCurrentUser();
  if (!user
    || !(await resolveStaffPermissionOnServer('media.approve')).allowed
    || !(await resolveStaffPermissionOnServer('media.edit_all')).allowed) {
    return NextResponse.json({error:'Forbidden'},{status:403});
  }
  let body:unknown;
  try {body=await readReaderJson(request);} catch(error){return NextResponse.json({error:'Invalid request'},{status:error instanceof ReaderWriteError?error.status:400});}
  if (!body || typeof body!=='object' || Array.isArray(body)) {
    return NextResponse.json({error:'Invalid review'},{status:400});
  }
  const reason=(body as Record<string,unknown>).reason;
  if (typeof reason!=='string' || reason.trim().length<8 || reason.trim().length>1200) {
    return NextResponse.json({error:'A review reason (8–1200 characters) is required'},{status:400});
  }
  const supabase=await getDataClient() as unknown as SupabaseClient;
  // Atomic compare-and-swap: do not reject anything already publishing.
  const {data,error}=await supabase.from('media_private_drafts')
    .update({
      state:'rejected',
      reviewed_by:user.id,
      reviewed_at:new Date().toISOString(),
      review_reason:reason.trim()
    })
    .eq('id',params.id).eq('state','pending')
    .select('id,state').maybeSingle();
  if (error) {
    console.error('Private draft rejection denied:',error.message);
    return NextResponse.json({error:'Review rejected by database policy'},{status:403});
  }
  if (!data) return NextResponse.json({error:'Draft already reviewed or not accessible'},{status:409});
  // Keep original private bytes for audit; never delete on rejection.
  return NextResponse.json({id:data.id,state:'rejected'},{headers:{'Cache-Control':'no-store'}});
}
