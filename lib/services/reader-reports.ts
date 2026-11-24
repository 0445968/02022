import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReaderReportReceipt,parseReaderReportPage,type ReaderReportCommand} from '@/lib/permissions/reader-report-contract';
export function readerReportingEnabled(){return !isDevAuthBypass()&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&process.env.CT_COMMENT_MODERATION_ENABLED==='true'&&process.env.CT_COMMENT_REPORTS_ENABLED==='true'&&process.env.CT_READER_REPORTING_ENABLED==='true';}
async function client(){
 if(!readerReportingEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(401);
 if(user.is_anonymous||!user.email||!user.email_confirmed_at)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function submitReaderReport(storyId:string,c:ReaderReportCommand){
 if(!DRAFT_UUID.test(storyId))throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('reader_submit_comment_report',{p_story:storyId,p_comment:c.commentId,p_updated_at:c.updatedAt,p_reason:c.reason});
 if(error)fail(error.code);
 try{return parseReaderReportReceipt(data,c.commentId);}catch{throw new DraftHttpError(503);}
}
export async function readOwnReports(page:number){
 if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('reader_list_own_reports',{p_page:page});
 if(error)fail(error.code);
 try{return parseReaderReportPage(data);}catch{throw new DraftHttpError(503);}
}
