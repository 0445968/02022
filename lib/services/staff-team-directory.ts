import 'server-only';

import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient as createSessionClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStaffPermissionOnServer} from '@/lib/permissions/server';
import {STAFF_ROLE_KEYS,type StaffRoleKey} from '@/lib/permissions/staff-admin-input';
import type {TeamAuditEntry,TeamDirectory,TeamMember,TeamPreset} from '@/lib/permissions/staff-team-types';

const MAX_MEMBERS=100;
const PAGE_SIZE=Math.min(MAX_MEMBERS,25);
const MAX_AUDIT=30;
const AUDIT_PAGE_SIZE=Math.min(MAX_AUDIT,15);
export type TeamListOptions={page?:number;auditPage?:number;status?:string;auditMemberId?:string};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=new Set(['invited','active','suspended','revoked']);

export type TeamAccess={
  allowed:boolean; userId:string|null;canManageRoles:boolean;
  canViewAudit:boolean;mutationsEnabled:boolean;
  canManageOverrides:boolean;overrideMutationsEnabled:boolean;
};

/**
 * Live auth is verified through the user's cookie-bound JWT. A reader's
 * profile.is_editor, mock DEV_AUTH_BYPASS, role title and user metadata are
 * never accepted as authority for viewing another member's roles.
 */
export async function getStaffTeamAccess():Promise<TeamAccess>{
  const denied:TeamAccess={allowed:false,userId:null,canManageRoles:false,
    canViewAudit:false,mutationsEnabled:false,
    canManageOverrides:false,overrideMutationsEnabled:false};
  if(process.env.CT_STAFF_ACCESS_V2_ENABLED!=='true'||isDevAuthBypass())return denied;
  const session=createSessionClient();
  const {data:{user},error}=await session.auth.getUser();
  if(error||!user)return denied;
  const canView=(await resolveStaffPermissionOnServer('team.view')).allowed;
  if(!canView)return denied;
  const [manage,audit,overrides]=await Promise.all([
    resolveStaffPermissionOnServer('team.manage_roles'),
    resolveStaffPermissionOnServer('team.view_audit'),
    resolveStaffPermissionOnServer('team.manage_overrides'),
  ]);
  return {allowed:true,userId:user.id,
    canManageRoles:manage.allowed,canViewAudit:audit.allowed,
    mutationsEnabled:manage.allowed && process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED==='true',
    canManageOverrides:overrides.allowed,
    overrideMutationsEnabled:overrides.allowed
      && process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED==='true'
      && process.env.CT_STAFF_OVERRIDE_MUTATIONS_ENABLED==='true'};
}

type RawRow=Record<string,any>;
function requireSuccess<T extends {data:unknown;error:unknown}>(result:T,label:string):NonNullable<T['data']>{
  if(result.error||!result.data)throw new Error('Staff directory read unavailable: '+label);
  return result.data as NonNullable<T['data']>;
}
function safeName(value:unknown,fallback:string):string{
  return typeof value==='string'&&value.trim()?value.trim().slice(0,120):fallback;
}
function roleKey(value:unknown):value is StaffRoleKey{
  return typeof value==='string'&&STAFF_ROLE_KEYS.includes(value as StaffRoleKey);
}

/**
 * SERVICE_ROLE is used only AFTER a fresh successful JWT + team.view check.
 * The RLS-visible staff table intentionally only permits own-row reads, so
 * an explicitly authorized directory requires this narrowly scoped backend
 * projection. Never send the key, raw table rows, profile email, audit JSON,
 * sensitive overrides or auth.users records to the browser.
 */
export async function readStaffTeamDirectory(
  access:TeamAccess, options:TeamListOptions={}
):Promise<TeamDirectory>{
  // Treat an input access snapshot as untrusted, even from another server
  // module. Recheck the actual cookie-bound principal and current grants
  // immediately before any privileged service-role read.
  const fresh=await getStaffTeamAccess();
  if(!access.allowed||!access.userId||!fresh.allowed
    ||fresh.userId!==access.userId)throw new Error('Forbidden');
  access=fresh;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Staff directory unavailable');
  const db=createServiceClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const page=Number.isInteger(options.page)&&options.page!>=0&&options.page!<=100
    ?options.page!:0;
  const auditPage=Number.isInteger(options.auditPage)&&options.auditPage!>=0&&options.auditPage!<=100
    ?options.auditPage!:0;
  const status=typeof options.status==='string'&&statuses.has(options.status)
    ?options.status:null;
  const auditMemberId=typeof options.auditMemberId==='string'
    &&uuidPattern.test(options.auditMemberId)?options.auditMemberId:null;

  let membersQuery=db.from('staff_memberships')
    .select('id,auth_user_id,status,member_type,expires_at,created_at',{count:'exact'})
    .order('created_at',{ascending:false}).order('id',{ascending:false})
    .range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1);
  if(status)membersQuery=membersQuery.eq('status',status);
  const [memberResult,presetResult]=await Promise.all([
    membersQuery,
    db.from('staff_role_presets')
      .select('id,role_key,name_en,name_es,is_builtin').order('role_key').limit(30),
  ]);
  const membersRaw=requireSuccess(memberResult,'members') as RawRow[];
  const presetsRaw=requireSuccess(presetResult,'presets') as RawRow[];
  const memberIds=membersRaw.map(m=>m.id as string);
  const userIds=membersRaw.map(m=>m.auth_user_id as string);
  const presetIds=presetsRaw.map(p=>p.id as string);

  const [rolesResult,grantsResult,profilesResult,auditResult]=await Promise.all([
    memberIds.length ? db.from('staff_member_roles')
      .select('membership_id,role_preset_id,granted_at,expires_at')
      .in('membership_id',memberIds).limit(500) : Promise.resolve({data:[],error:null}),
    presetIds.length ? db.from('staff_role_capabilities')
      .select('role_preset_id,capability_key,scope')
      .in('role_preset_id',presetIds).limit(1000) : Promise.resolve({data:[],error:null}),
    userIds.length ? db.from('profiles').select('id,name')
      .in('id',userIds).limit(MAX_MEMBERS) : Promise.resolve({data:[],error:null}),
    access.canViewAudit ? (() => {
      let query=db.from('staff_access_audit')
        .select('id,subject_membership_id,actor_auth_user_id,action_key,reason,created_at',
          {count:'exact'})
        .order('created_at',{ascending:false}).order('id',{ascending:false})
        .range(auditPage*AUDIT_PAGE_SIZE,(auditPage+1)*AUDIT_PAGE_SIZE-1);
      if(auditMemberId)query=query.eq('subject_membership_id',auditMemberId);
      return query;
    })() : Promise.resolve({data:[],error:null,count:0}),
  ]);
  const roles=requireSuccess(rolesResult,'roles') as RawRow[];
  const grants=requireSuccess(grantsResult,'grants') as RawRow[];
  const profiles=requireSuccess(profilesResult,'profile names') as RawRow[];
  const audits=requireSuccess(auditResult,'access audit') as RawRow[];
  const names=new Map(profiles.map(p=>[p.id as string,safeName(p.name,'Staff member')]));
  // Auditors see only the actor's display name if the account is in the
  // authorized roster; never a raw Auth UUID or private email.
  const presetKeys=new Map(presetsRaw.filter(p=>roleKey(p.role_key))
    .map(p=>[p.id as string,p.role_key as StaffRoleKey]));

  const members:TeamMember[]=membersRaw.map(m=>({
    id:m.id,name:names.get(m.auth_user_id)??'Staff member',
    memberType:m.member_type,status:m.status,
    expiresAt:m.expires_at,joinedAt:m.created_at,
    isSelf:m.auth_user_id===access.userId,
    roles:roles.filter(r=>r.membership_id===m.id && presetKeys.has(r.role_preset_id))
      .map(r=>({roleKey:presetKeys.get(r.role_preset_id)!,
        grantedAt:r.granted_at,expiresAt:r.expires_at}))
  }));
  const presets:TeamPreset[]=presetsRaw.filter(p=>roleKey(p.role_key)).map(p=>({
    key:p.role_key,nameEn:p.name_en,nameEs:p.name_es,isBuiltin:!!p.is_builtin,
    configuredGrants:grants.filter(g=>g.role_preset_id===p.id)
      .filter(g=>['all','assigned','own'].includes(g.scope))
      .map(g=>({capability:String(g.capability_key),scope:g.scope}))
  }));
  const audit:TeamAuditEntry[]=audits.map(a=>({
    id:a.id,subjectMembershipId:a.subject_membership_id,
    action:safeName(a.action_key,'Access change'),
    reason:typeof a.reason==='string'?a.reason.slice(0,500):null,
    occurredAt:a.created_at,
    actorName:names.get(a.actor_auth_user_id)??'Authorized administrator'
  }));
  // audit data does not leak any before_state/after_state JSON or credentials.
  const totalMembers=memberResult.count??members.length;
  const totalAudit=access.canViewAudit?(auditResult.count??audits.length):0;
  return {members,presets,audit,totalMembers,page,pageSize:PAGE_SIZE,
    hasMoreMembers:(page+1)*PAGE_SIZE<totalMembers,
    auditPage,auditPageSize:AUDIT_PAGE_SIZE,totalAudit,
    hasMoreAudit:access.canViewAudit&&(auditPage+1)*AUDIT_PAGE_SIZE<totalAudit,
    canManageRoles:access.canManageRoles,canViewAudit:access.canViewAudit,
    mutationsEnabled:access.mutationsEnabled,
    canManageOverrides:access.canManageOverrides,
    overrideMutationsEnabled:access.overrideMutationsEnabled};
}
