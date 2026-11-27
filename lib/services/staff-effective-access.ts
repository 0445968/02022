import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient as createSessionClient} from '@/lib/db/supabase-server';
import {CAPABILITY_KEYS,isCapability,resolveEffectivePermission,
  type Capability,type CapabilityGrant,type CapabilityOverride,
  type MembershipSnapshot,type AccessScope} from '@/lib/permissions/capabilities';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {canOverrideCapability} from '@/lib/permissions/staff-override-input';
import type {MemberEffectiveAccess,MemberOverride} from '@/lib/permissions/staff-effective-types';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE=new Set(['all','assigned','own']);
const asScope=(x:string):x is AccessScope=>SCOPE.has(x);
const isLive=(expiry:string|null)=>expiry===null||(
  Number.isFinite(Date.parse(expiry))&&Date.parse(expiry)>Date.now()
);
type Row=Record<string,any>;
const requireRows=(result:{data:any;error:any},what:string):Row[]=>{
  if(result.error||!Array.isArray(result.data))throw Error('Cannot read '+what);
  return result.data;
};

export async function loadEffectiveMemberPermissions(targetId:string):Promise<MemberEffectiveAccess>{
  if(!UUID.test(targetId))throw Error('Invalid member');
  // Live verified principal and current permission are rechecked immediately
  // before acquiring the server-only key. No request-supplied role snapshots.
  const access=await getStaffTeamAccess();
  if(!access.allowed||!access.userId||!access.canManageOverrides){
    throw Error('Forbidden');
  }
  const session=createSessionClient();
  const {data:{user},error:authError}=await session.auth.getUser();
  if(authError||!user||user.id!==access.userId)throw Error('Forbidden');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)throw Error('Unavailable');
  const db=createServiceClient(url,secret,{
    auth:{autoRefreshToken:false,persistSession:false}
  });
  const {data:member,error}=await db.from('staff_memberships')
    .select('id,auth_user_id,status,expires_at').eq('id',targetId).maybeSingle();
  if(error||!member)throw Error('Not found');
  const [roleResult,overrideResult]=await Promise.all([
    db.from('staff_member_roles')
      .select('role_preset_id,expires_at').eq('membership_id',targetId).limit(30),
    db.from('staff_capability_overrides')
      .select('id,capability_key,effect,scope,expires_at,reason')
      .eq('membership_id',targetId).order('created_at',{ascending:false}).limit(150)
  ]);
  const roles=requireRows(roleResult,'role assignments');
  const rawOverrides=requireRows(overrideResult,'permission exceptions');
  const ids=[...new Set(roles.map(r=>r.role_preset_id as string))];
  const grantResult=ids.length?await db.from('staff_role_capabilities')
      .select('role_preset_id,capability_key,scope')
      .in('role_preset_id',ids).limit(1000)
      :{data:[],error:null};
  const rawGrants=requireRows(grantResult,'actual role grants');
  const grants:CapabilityGrant[]=rawGrants.flatMap(row=>{
    const role=roles.find(r=>r.role_preset_id===row.role_preset_id);
    if(!role||!isCapability(row.capability_key)||!asScope(row.scope))return [];
    return [{capability:row.capability_key,scope:row.scope,expiresAt:role.expires_at}];
  });
  const overrides:MemberOverride[]=rawOverrides.flatMap(row=>{
    if(!isCapability(row.capability_key)||!canOverrideCapability(row.capability_key)
      ||!asScope(row.scope)||(row.effect!=='allow'&&row.effect!=='deny'))return [];
    return [{id:row.id,capability:row.capability_key,scope:row.scope,
      effect:row.effect,expiresAt:row.expires_at,reason:String(row.reason).slice(0,500)}];
  });
  const policies:CapabilityOverride[]=overrides.map(o=>({
    capability:o.capability,scope:o.scope,effect:o.effect,expiresAt:o.expiresAt
  }));
  const snapshot:MembershipSnapshot={
    id:member.id,authUserId:member.auth_user_id,status:member.status,
    expiresAt:member.expires_at,roleGrants:grants,overrides:policies
  };
  const now=new Date();
  const permissions=CAPABILITY_KEYS.filter(cap=>cap!=='reader.personal').map(capability=>{
    const decision=resolveEffectivePermission(
      {userId:member.auth_user_id},snapshot,capability,undefined,now
    );
    const rules=[...grants,...policies.filter(p=>p.effect==='allow')]
      .filter(p=>p.capability===capability&&isLive(p.expiresAt??null));
    const denial=policies.filter(p=>p.capability===capability
      &&p.effect==='deny'&&isLive(p.expiresAt??null));
    const globalDeny=denial.some(p=>p.scope==='all');
    // Public result must NEVER claim assigned/own access was evaluated.
    // A scoped deny can also override a broad grant for one resource.
    const contextDependent=rules.length>0&&(
      rules.some(p=>p.scope!=='all')
      ||denial.some(p=>p.scope!=='all')
      ||['story.view_assigned','story.edit_assigned',
        'revision.edit_assigned','calendar.view_assigned','assignment.view_assigned','assignment.update_assigned',
        'media.edit_own'].includes(capability)
    );
    let state:'allowed'|'denied'|'conditional'='denied';
    let explanation:string=decision.reason;
    if(globalDeny){state='denied';explanation='explicit_deny';}
    else if(decision.allowed&&!contextDependent){state='allowed';explanation='grant_verified';}
    else if(contextDependent && rules.length>0
      &&member.status==='active'&&isLive(member.expires_at)){
      state='conditional';explanation='resource_check_required';
    }
    return {capability,state,explanation};
  });
  return {membershipId:targetId,asOf:now.toISOString(),status:member.status,
    overrides,permissions,
    note:'Conditional is NOT a grant: assigned/own scope and scoped denials require an actual server-verified resource.'};
}
