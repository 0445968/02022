import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {assignedDraftEnabled} from '@/lib/services/assigned-drafts';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID,isDraftTimestamp} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import type {RevisionCommand,RevisionState} from '@/lib/permissions/assigned-revision-contract';
export function assignedRevisionEnabled(){return assignedDraftEnabled()&&process.env.CT_ASSIGNED_REVISION_EDITOR_ENABLED==='true';}
async function client(storyId:string){
 if(!assignedRevisionEnabled()||!DRAFT_UUID.test(storyId))throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 const keys=['newsroom.access','story.view_assigned','story.edit_assigned','revision.view','revision.edit_assigned'];
 const grants=await resolveStoryStaffPermissionsOnServer(storyId,keys);
 if(!keys.every(k=>grants.has(k)))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function failure(code:string|undefined):never{
 throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='P0002'?404:code==='22023'?422:503);
}
function state(raw:unknown,id:string):RevisionState{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DraftHttpError(503);
 const s=raw as RevisionState;
 if(s.id!==id||!isDraftTimestamp(s.updatedAt)||!isDraftTimestamp(s.liveUpdatedAt)
 ||(s.revisionId!==null&&(typeof s.revisionId!=='string'||!DRAFT_UUID.test(s.revisionId)))
 ||(s.status!=='draft'&&s.status!=='in_review')||(s.language!=='en'&&s.language!=='es')
 ||typeof s.headline!=='string'||!s.body||typeof s.body!=='object'||Array.isArray(s.body)||typeof s.canSubmit!=='boolean')throw new DraftHttpError(503);
 return s;
}
export async function readAssignedRevision(id:string){
 const db=await client(id);
 const {data,error}=await db.rpc('staff_read_assigned_revision',{p_story:id});
 if(error)failure(error.code);
 return state(data,id);
}
export async function saveAssignedRevision(id:string,command:RevisionCommand){
 const db=await client(id);
 const {data,error}=await db.rpc('staff_save_assigned_revision',{p_story:id,p_live_updated_at:command.liveUpdatedAt,
   p_revision:command.revisionId,p_updated_at:command.expectedUpdatedAt,p_action:command.action,
   p_headline:command.copy.headline,p_subheadline:command.copy.subheadline,p_summary:command.copy.summary,p_body:command.copy.body});
 if(error)failure(error.code);
 return state(data,id);
}
