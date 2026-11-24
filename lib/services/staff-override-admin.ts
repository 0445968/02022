import 'server-only';

import {randomUUID} from 'node:crypto';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient as createSessionClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStaffPermissionOnServer} from '@/lib/permissions/server';
import {validateOverrideChange,type OverrideChangeInput} from '@/lib/permissions/staff-override-input';

export type OverrideChangeResult=
  | {ok:true;requestId:string}
  | {ok:false;code:'disabled'|'invalid'|'unauthorized'|'forbidden'|'rejected'};
/**
 * Only the server may hold service_role. This is NOT a fallback for
 * missing RLS. The DB SECURITY INVOKER RPC independently enforces a current
 * owner, protects owner/self membership and writes an atomic audit entry.
 */
export async function applyStaffOverrideChange(input:OverrideChangeInput):Promise<OverrideChangeResult>{
  if(process.env.CT_STAFF_ACCESS_V2_ENABLED!=='true'
    ||process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED!=='true'
    ||process.env.CT_STAFF_OVERRIDE_MUTATIONS_ENABLED!=='true'
    ||isDevAuthBypass())return {ok:false,code:'disabled'};

  let validated;
  try{validated=validateOverrideChange(input);}
  catch{return {ok:false,code:'invalid'};}

  try{
    const session=createSessionClient();
    const {data:{user},error}=await session.auth.getUser();
    if(error||!user)return {ok:false,code:'unauthorized'};
    if(!(await resolveStaffPermissionOnServer('team.manage_overrides')).allowed){
      return {ok:false,code:'forbidden'};
    }
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!secret)return {ok:false,code:'disabled'};
    const db=createServiceClient(url,secret,{
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const requestId=randomUUID();
    const {data,error:rpcError}=await db.rpc('staff_apply_override_change',{
      p_actor_auth_user_id:user.id,
      p_target_membership_id:validated.targetMembershipId,
      p_operation:validated.operation,
      p_capability:validated.capability,
      p_scope:validated.scope,
      p_effect:validated.effect,
      p_expires_at:validated.expiresAt,
      p_reason:validated.reason,
      p_request_id:requestId,
    });
    if(rpcError||data!==requestId)return {ok:false,code:'rejected'};
    return {ok:true,requestId};
  }catch{return {ok:false,code:'rejected'};}
}
