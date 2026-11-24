import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {resolveGlobalStaffPermissionsOnServer} from '@/lib/permissions/server';
import {storyReviewEnabled} from '@/lib/services/story-review';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseInboxPage,parseFeedbackReceipt,type InboxMode} from '@/lib/permissions/review-inbox-contract';
export function reviewInboxEnabled(){return storyReviewEnabled()&&process.env.CT_REVIEW_INBOX_ENABLED==='true';}
async function client(){
 if(!reviewInboxEnabled())throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new DraftHttpError(403);
 if(!(await resolveGlobalStaffPermissionsOnServer(['newsroom.access'])).has('newsroom.access'))throw new DraftHttpError(404);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='22023'?422:code==='40001'||code==='40P01'?409:503);}
export async function readReviewInbox(mode:InboxMode,page:number){
 if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_read_review_inbox',{p_mode:mode,p_page:page});
 if(error)fail(error.code);
 try{return parseInboxPage(data,mode);}catch{throw new DraftHttpError(503);}
}
export async function acknowledgeReviewFeedback(id:string){
 if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);
 const db=await client();
 const {data,error}=await db.rpc('staff_acknowledge_review_feedback',{p_request:id});
 if(error)fail(error.code);
 try{return parseFeedbackReceipt(data,id);}catch{throw new DraftHttpError(503);}
}
