import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {commentModerationEnabled} from '@/lib/services/comment-moderation';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReportDetail,parseReportPage,type ReportFilter,type ReportCommand} from '@/lib/permissions/comment-report-contract';
export function reportManagementEnabled(){return commentModerationEnabled()&&process.env.CT_COMMENT_REPORTS_ENABLED==='true';}
async function client(){
 if(!reportManagementEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!(await resolveGlobalStaffPermissionsOnServer(['newsroom.access'])).has('newsroom.access'))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function readReportQueue(status:ReportFilter,storyId:string|null,page:number){
 if((storyId!==null&&!DRAFT_UUID.test(storyId))||!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const db=await client();const {data,error}=await db.rpc('staff_read_report_queue',{p_status:status,p_story:storyId,p_page:page});
 if(error)fail(error.code);try{return parseReportPage(data);}catch{throw new DraftHttpError(503);}
}
export async function readReportDetail(id:string){
 if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);
 const db=await client();const {data,error}=await db.rpc('staff_read_report_detail',{p_report:id});
 if(error)fail(error.code);try{return parseReportDetail(data,id);}catch{throw new DraftHttpError(503);}
}
export async function resolveCommentReport(c:ReportCommand){
 const db=await client();const {data,error}=await db.rpc('staff_resolve_comment_report',{p_report:c.reportId,p_revision:c.revision,p_comment_revision:c.commentRevision,p_target:c.target,p_reason:c.reason,p_event:c.actionEventId,p_command:c.commandId});
 if(error)fail(error.code);try{return parseReportDetail(data,c.reportId);}catch{throw new DraftHttpError(503);}
}
