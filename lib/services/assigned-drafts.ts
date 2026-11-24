import 'server-only';
import {assignedApprovedMediaEnabled} from '@/lib/services/assigned-media';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID,isDraftTimestamp,existingImagesOnly,type DraftState,type DraftCommand} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export function assignedDraftEnabled(){
 return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_ASSIGNED_DRAFT_EDITOR_ENABLED==='true'&&!isDevAuthBypass();
}
const columns='id,headline,subheadline,summary,body,language,status,updated_at';
async function actor(storyId:string){
 if(!assignedDraftEnabled())throw new DraftHttpError(404);
 if(!DRAFT_UUID.test(storyId))throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 const grants=await resolveStoryStaffPermissionsOnServer(storyId,['newsroom.access','story.view_assigned','story.edit_assigned','story.submit_review']);
 if(!grants.has('newsroom.access')||!grants.has('story.view_assigned')||!grants.has('story.edit_assigned'))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return {db,userId:user.id,canSubmit:grants.has('story.submit_review')};
}
function map(row:Record<string,unknown>,canSubmit:boolean):DraftState{
 if((row.status!=='draft'&&row.status!=='in_review')||!isDraftTimestamp(row.updated_at)||
   (row.language!=='en'&&row.language!=='es')||typeof row.id!=='string'||typeof row.headline!=='string'||
   !row.body||typeof row.body!=='object'||Array.isArray(row.body))throw new DraftHttpError(409);
 return {id:row.id,headline:row.headline,subheadline:typeof row.subheadline==='string'?row.subheadline:null,
   summary:typeof row.summary==='string'?row.summary:null,body:row.body as Record<string,unknown>,
   language:row.language,status:row.status,updatedAt:row.updated_at,canSubmit:canSubmit&&row.status==='draft'};
}
export async function readAssignedDraft(storyId:string){
 const {db,canSubmit}=await actor(storyId);
 const {data,error}=await db.from('stories').select(columns).eq('id',storyId).in('status',['draft','in_review']).maybeSingle();
 if(error)throw new DraftHttpError(503);
 if(!data)throw new DraftHttpError(404);
 return map(data,canSubmit);
}
export async function writeAssignedDraft(storyId:string,command:DraftCommand):Promise<DraftState>{
 const {db,userId,canSubmit}=await actor(storyId);
 if(command.action==='submit'&&!canSubmit)throw new DraftHttpError(403);
 const {data:old,error:readError}=await db.from('stories').select('body,updated_at,status').eq('id',storyId).eq('status','draft').maybeSingle();
 if(readError)throw new DraftHttpError(503);
 if(!old||old.updated_at!==command.expectedUpdatedAt)throw new DraftHttpError(409);
 if(!existingImagesOnly(old.body,command.copy.body)&&!assignedApprovedMediaEnabled())throw new DraftHttpError(422);
 if(assignedApprovedMediaEnabled()){
   const {data,error}=await db.rpc('staff_save_assigned_draft_with_media',{p_story:storyId,
     p_updated_at:command.expectedUpdatedAt,p_action:command.action,p_headline:command.copy.headline,
     p_subheadline:command.copy.subheadline,p_summary:command.copy.summary,p_body:command.copy.body});
   if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='22023'?422:error.code==='40001'||error.code==='40P01'?409:503);
   if(!data)throw new DraftHttpError(409);
   return map(data,canSubmit);
 }
 // One user-session RLS update, exact original timestamp and draft status.
 // The DB trigger independently rejects assigned-only protected-field changes.
 const {data,error}=await db.from('stories').update({
   headline:command.copy.headline,subheadline:command.copy.subheadline,summary:command.copy.summary,body:command.copy.body,
   updated_by:userId,...(command.action==='submit'?{status:'in_review'}:{})
 }).eq('id',storyId).eq('status','draft').eq('updated_at',command.expectedUpdatedAt).select(columns).maybeSingle();
 if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='22023'?422:503);
 if(!data)throw new DraftHttpError(409);
 return map(data,canSubmit);
}
