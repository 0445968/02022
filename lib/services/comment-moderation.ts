import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseModerationPage,parseModerationDetail,type ModerationFilter,type ModerationCommand} from '@/lib/permissions/comment-moderation-contract';
export function commentModerationEnabled(){return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_COMMENT_MODERATION_ENABLED==='true'&&!isDevAuthBypass();}
async function client(){
 if(!commentModerationEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!(await resolveGlobalStaffPermissionsOnServer(['newsroom.access'])).has('newsroom.access'))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function readCommentQueue(status:ModerationFilter,storyId:string|null,search:string,page:number){
 if((storyId!==null&&!DRAFT_UUID.test(storyId))||search.length>120||!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_read_comment_queue',{p_status:status,p_story:storyId,p_search:search,p_page:page});
 if(error)fail(error.code);
 try{return parseModerationPage(data);}catch{throw new DraftHttpError(503);}
}
export async function readCommentDetail(id:string){
 if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_read_comment_detail',{p_comment:id});
 if(error)fail(error.code);
 try{return parseModerationDetail(data,id);}catch{throw new DraftHttpError(503);}
}
export async function changeCommentModeration(c:ModerationCommand){
 const db=await client();
 const {data,error}=await db.rpc('staff_change_comment_moderation',{p_comment:c.commentId,p_revision:c.revision,p_action:c.action,p_reason:c.reason,p_command:c.commandId});
 if(error)fail(error.code);
 try{return parseModerationDetail(data,c.commentId);}catch{throw new DraftHttpError(503);}
}
