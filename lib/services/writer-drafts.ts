import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {assignedDraftEnabled} from '@/lib/services/assigned-drafts';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import type {WriterDraftInput} from '@/lib/permissions/writer-draft-contract';
export function writerCreationEnabled(){return assignedDraftEnabled()&&process.env.CT_WRITER_DRAFT_CREATION_ENABLED==='true';}
async function client(){
 if(!writerCreationEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||user.is_anonymous!==false||!user.email_confirmed_at)throw new DraftHttpError(403);
 const keys=['newsroom.access','story.create'];
 const grants=await resolveGlobalStaffPermissionsOnServer(keys);
 if(!keys.every(k=>grants.has(k)))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id||fresh.is_anonymous!==false||!fresh.email_confirmed_at)throw new DraftHttpError(403);
 return db;
}
export async function canStartWriterDraft():Promise<boolean>{
 if(!writerCreationEnabled())return false;
 try{const db=await client();const {data,error}=await db.rpc('staff_can_start_writer_draft');
 return !error&&data===true;}catch{return false;}
}
export async function startWriterDraft(input:WriterDraftInput):Promise<string>{
 const db=await client();
 const {data,error}=await db.rpc('staff_start_writer_draft',{p_request:input.requestId,p_headline:input.headline,p_language:input.language});
 if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'?422:503);
 if(typeof data!=='string'||!DRAFT_UUID.test(data))throw new DraftHttpError(503);
 return data;
}
