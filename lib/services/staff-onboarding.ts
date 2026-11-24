import 'server-only';
import {randomUUID} from 'node:crypto';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStaffPermissionOnServer} from '@/lib/permissions/server';
import {INVITE_UUID} from '@/lib/permissions/staff-invite-http';
import type {StaffOnboardingInput} from '@/lib/permissions/staff-onboarding-input';
import type {StaffOnboardingState} from '@/lib/permissions/staff-onboarding-types';

export function staffOnboardingEnabled(){
  return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'&&
    process.env.CT_STAFF_ONBOARDING_ENABLED==='true'&&!isDevAuthBypass();
}
export class StaffOnboardingError extends Error{
  constructor(public readonly status:number){super('Staff onboarding unavailable');}
}
async function verifiedActor(){
  if(!staffOnboardingEnabled())throw new StaffOnboardingError(404);
  const {data:{user},error}=await createClient().auth.getUser();
  if(error||!user||!INVITE_UUID.test(user.id)||!user.email||!user.email_confirmed_at||
    !Number.isFinite(Date.parse(user.email_confirmed_at))||
    Date.parse(user.email_confirmed_at)>Date.now()||user.is_anonymous!==false)
    throw new StaffOnboardingError(403);
  if(!(await resolveStaffPermissionOnServer('newsroom.access')).allowed)
    throw new StaffOnboardingError(403);
  const {data:{user:fresh},error:freshError}=await createClient().auth.getUser();
  if(freshError||fresh?.id!==user.id||fresh.is_anonymous!==false||
    !fresh.email||!fresh.email_confirmed_at)throw new StaffOnboardingError(403);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new StaffOnboardingError(503);
  return {actor:fresh.id,db:createServiceClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})};
}
function rpcError(code:string|undefined):never{
  throw new StaffOnboardingError(code==='42501'?403:code==='40001'?409:code==='22023'?422:503);
}
function state(raw:unknown):StaffOnboardingState{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new StaffOnboardingError(503);
  const r=raw as StaffOnboardingState;
  if(!['employee','contractor','freelancer'].includes(r.memberType)||!Array.isArray(r.roles)||
    r.roles.some(x=>typeof x.key!=='string'||typeof x.nameEn!=='string'||typeof x.nameEs!=='string')||
    (r.profile!==null&&(!r.profile||typeof r.profile.displayName!=='string'||
      !['en','es'].includes(r.profile.locale)||!Number.isInteger(r.profile.revision)||
      r.profile.acknowledgedVersion!==1||typeof r.profile.bylineRequested!=='boolean')))
    throw new StaffOnboardingError(503);
  return r;
}
export async function readStaffOnboarding():Promise<StaffOnboardingState>{
  const {actor,db}=await verifiedActor();
  const {data,error}=await db.rpc('staff_read_onboarding',{p_actor:actor});
  if(error)rpcError(error.code);
  return state(data);
}
export async function saveStaffOnboarding(input:StaffOnboardingInput):Promise<StaffOnboardingState>{
  const {actor,db}=await verifiedActor();
  const {data,error}=await db.rpc('staff_save_onboarding',{
    p_actor:actor,p_expected_revision:input.expectedRevision,p_display_name:input.displayName,
    p_locale:input.locale,p_byline_requested:input.bylineRequested,
    p_acknowledged_version:input.acknowledgedVersion,p_request_id:randomUUID()});
  if(error)rpcError(error.code);
  return state(data);
}
