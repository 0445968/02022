import 'server-only';
import {randomUUID} from 'node:crypto';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient as createSessionClient} from '@/lib/db/supabase-server';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {validatePresetGrantChange,type PresetGrantChange} from '@/lib/permissions/staff-preset-input';

export type PresetSaveResult=
 | {ok:true;requestId:string;revision:number}
 | {ok:false;code:'disabled'|'unauthorized'|'invalid'|'conflict'|'rejected'};

/** Backend permission check PLUS independent current-owner DB assertion. */
export async function applyStaffPresetGrantChange(
  input:PresetGrantChange
):Promise<PresetSaveResult>{
  if(process.env.CT_STAFF_ACCESS_V2_ENABLED!=='true'
    ||process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED!=='true'
    ||process.env.CT_STAFF_PRESET_MUTATIONS_ENABLED!=='true'){
    return {ok:false,code:'disabled'};
  }
  let validated:PresetGrantChange;
  try{validated=validatePresetGrantChange(input);
    if(process.env.CT_WORK_ASSIGNMENTS_ENABLED!=='true'&&validated.grants.some(g=>g.capability.startsWith('assignment.')))return {ok:false,code:'disabled'};}
  catch{return {ok:false,code:'invalid'};}
  try{
    const access=await getStaffTeamAccess();
    if(!access.allowed||!access.userId||!access.canManageRoles
      ||!access.mutationsEnabled)return {ok:false,code:'unauthorized'};
    const session=createSessionClient();
    const {data:{user},error:authError}=await session.auth.getUser();
    if(authError||!user||user.id!==access.userId){
      return {ok:false,code:'unauthorized'};
    }
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return {ok:false,code:'disabled'};
    const db=createServiceClient(url,key,{
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const requestId=randomUUID();
    const {data,error}=await db.rpc('staff_save_preset_grants',{
      p_actor_auth_user_id:user.id,
      p_role_key:validated.roleKey,
      p_expected_revision:validated.expectedRevision,
      p_grants:validated.grants,
      p_reason:validated.reason,
      p_request_id:requestId
    });
    if(error){
      if(error.code==='40001')return {ok:false,code:'conflict'};
      return {ok:false,code:'rejected'};
    }
    if(!Number.isSafeInteger(data)||data<=validated.expectedRevision){
      return {ok:false,code:'rejected'};
    }
    return {ok:true,requestId,revision:data};
  }catch{
    return {ok:false,code:'rejected'};
  }
}
