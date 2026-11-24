import 'server-only';
import {randomUUID} from 'node:crypto';
import {createClient as serviceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {resolveStaffPermissionOnServer} from '@/lib/permissions/server';
import {staffOnboardingEnabled} from '@/lib/services/staff-onboarding';
import {BYLINE_UUID,type BylineReviewInput} from '@/lib/permissions/staff-byline-input';
import type {BylineRequest,BylineCandidate,BylinePage} from '@/lib/permissions/staff-byline-types';
export function staffBylineReviewEnabled(){
  return staffOnboardingEnabled()&&process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED==='true'
    &&process.env.CT_STAFF_BYLINE_REVIEW_ENABLED==='true';
}
export class BylineError extends Error{
  constructor(public readonly status:number){super('Byline review unavailable');}
}
async function owner(){
  if(!staffBylineReviewEnabled())throw new BylineError(404);
  const {data:{user},error}=await createClient().auth.getUser();
  if(error||!user||!BYLINE_UUID.test(user.id)||user.is_anonymous!==false||!user.email||!user.email_confirmed_at)
    throw new BylineError(403);
  if(!(await resolveStaffPermissionOnServer('byline.manage')).allowed)throw new BylineError(403);
  const {data:{user:fresh},error:freshError}=await createClient().auth.getUser();
  if(freshError||fresh?.id!==user.id||fresh.is_anonymous!==false||!fresh.email_confirmed_at)
    throw new BylineError(403);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new BylineError(503);
  const db=serviceClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const check=await db.rpc('staff_byline_owner_allowed',{p_actor:fresh.id});
  if(check.error||check.data!==true)throw new BylineError(403);
  return {db,actor:fresh.id};
}
export async function canReviewStaffBylines(){try{await owner();return true;}catch{return false;}}
function fail(code:string|undefined):never{
  throw new BylineError(code==='42501'?403:code==='40001'||code==='23505'?409:code==='22023'?422:503);
}
export async function listBylineRequests(page:number):Promise<BylinePage<BylineRequest>>{
  if(!Number.isInteger(page)||page<0||page>100)throw new BylineError(400);
  const {db,actor}=await owner();
  const {data,error}=await db.rpc('staff_list_byline_requests',{p_actor:actor,p_page:page});
  if(error)fail(error.code);
  if(!Array.isArray(data)||data.length>26)throw new BylineError(503);
  return {items:data.slice(0,25),hasMore:data.length>25&&page<100,page};
}
export async function listBylineCandidates(member:string,page:number):Promise<BylinePage<BylineCandidate>>{
  if(!BYLINE_UUID.test(member)||!Number.isInteger(page)||page<0||page>100)throw new BylineError(400);
  const {db,actor}=await owner();
  const {data,error}=await db.rpc('staff_list_byline_candidates',{p_actor:actor,p_member:member,p_page:page});
  if(error)fail(error.code);
  if(!Array.isArray(data)||data.length>26)throw new BylineError(503);
  return {items:data.slice(0,25),hasMore:data.length>25&&page<100,page};
}
export async function reviewStaffByline(input:BylineReviewInput){
  const {db,actor}=await owner();
  const {data,error}=await db.rpc('staff_review_byline',{p_actor:actor,p_member:input.membershipId,
    p_expected_profile_revision:input.profileRevision,p_expected_review_revision:input.reviewRevision,
    p_action:input.action,p_byline:input.bylineId,p_reason:input.reason,p_request_id:randomUUID()});
  if(error||data!==input.reviewRevision+1)fail(error?.code);
  return {ok:true as const,revision:data};
}
