import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {resolveStoryStaffPermissionsOnServer} from '@/lib/permissions/server';
import {canPublishReviewed,reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';
import {canAccessStoryReview} from '@/lib/services/story-review';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReviewedSchedule,type ScheduleCommand} from '@/lib/permissions/reviewed-schedule-contract';
import type {ReviewKind} from '@/lib/permissions/story-review-contract';
export function reviewedSchedulingEnabled(){return reviewedPublicationEnabled()&&process.env.CT_REVIEWED_SCHEDULING_ENABLED==='true';}
export async function canManageReviewedSchedule(id:string,kind:ReviewKind){
 return reviewedSchedulingEnabled()&&await canPublishReviewed(id,kind)&&(await resolveStoryStaffPermissionsOnServer(id,['story.schedule'])).has('story.schedule');
}
async function client(id:string,kind:ReviewKind,write:boolean){
 if(!reviewedSchedulingEnabled()||!DRAFT_UUID.test(id))throw new DraftHttpError(404);
 const db=createClient() as unknown as SupabaseClient;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user||!(write?await canManageReviewedSchedule(id,kind):await canAccessStoryReview(id,kind)||await canManageReviewedSchedule(id,kind)))throw new DraftHttpError(403);
 const {data:{user:fresh},error:freshError}=await db.auth.getUser();
 if(freshError||fresh?.id!==user.id)throw new DraftHttpError(403);
 return db;
}
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
export async function readReviewedSchedule(id:string,kind:ReviewKind){
 const db=await client(id,kind,false);
 const {data,error}=await db.rpc('staff_read_reviewed_schedule',{p_story:id,p_kind:kind});
 if(error)fail(error.code);
 try{return parseReviewedSchedule(data,kind);}catch{throw new DraftHttpError(503);}
}
export async function changeReviewedSchedule(id:string,c:ScheduleCommand){
 const db=await client(id,c.kind,true);
 const {data,error}=c.action==='schedule'?await db.rpc('staff_create_reviewed_schedule',{p_story:id,p_kind:c.kind,p_request:c.requestId,p_fingerprint:c.fingerprint,p_due:c.dueAt}):await db.rpc('staff_cancel_reviewed_schedule',{p_story:id,p_kind:c.kind,p_schedule:c.scheduleId});
 if(error)fail(error.code);
 if(c.action==='cancel'){
  if(!data||data.id!==c.scheduleId||data.state!=='cancelled')throw new DraftHttpError(503);
  return {id:c.scheduleId,state:'cancelled'};
 }
 try{const value=parseReviewedSchedule(data,c.kind);if(!value)throw Error();return value;}catch{throw new DraftHttpError(503);}
}
