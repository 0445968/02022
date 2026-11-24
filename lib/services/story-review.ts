import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReviewState,type ReviewKind,type ReviewCommand} from '@/lib/permissions/story-review-contract';
export function storyReviewEnabled(){return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_STORY_REVIEW_ENABLED==='true'&&!isDevAuthBypass();}
async function client(id:string,kind:ReviewKind,action?:ReviewCommand['action']){
 if(!storyReviewEnabled()||!DRAFT_UUID.test(id))throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 const keys=['newsroom.access','story.view_all','story.view_assigned','story.edit_all','story.edit_assigned','story.submit_review','story.review','revision.view','revision.edit_assigned'];
 const g=await resolveStoryStaffPermissionsOnServer(id,keys);
 const submit=g.has('story.submit_review')&&(g.has('story.edit_all')||(g.has('story.edit_assigned')&&(kind==='draft'||g.has('revision.edit_assigned'))));
 const review=g.has('story.review');
 if(!g.has('newsroom.access')||(!g.has('story.view_all')&&!g.has('story.view_assigned'))||(kind==='revision'&&!g.has('revision.view'))
 ||!(action==='request'?submit:action?review:submit||review))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function failure(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:code==='P0002'?404:503);}
export async function readStoryReview(id:string,kind:ReviewKind){
 const db=await client(id,kind);
 const {data,error}=await db.rpc('staff_read_review',{p_story:id,p_kind:kind});
 if(error)failure(error.code);
 try{return parseReviewState(data,id,kind);}catch{throw new DraftHttpError(503);}
}
export async function changeStoryReview(id:string,c:ReviewCommand){
 const db=await client(id,c.kind,c.action);
 const {data,error}=await db.rpc('staff_change_review',{p_story:id,p_kind:c.kind,p_action:c.action,p_fingerprint:c.fingerprint,p_request:c.requestId,p_note:c.note,p_command:c.commandId});
 if(error)failure(error.code);
 try{return parseReviewState(data,id,c.kind);}catch{throw new DraftHttpError(503);}
}
