import {EDITORIAL_OWN_PRIVILEGES,isCapability,type AccessScope,type Capability} from '@/lib/permissions/capabilities';

export type OverrideEffect='allow'|'deny';
export type OverrideOperation='set'|'remove';
export type OverrideChangeInput={
  targetMembershipId:string;
  operation:OverrideOperation;
  capability:Capability;
  scope:AccessScope;
  effect?:OverrideEffect|null;
  expiresAt?:string|null;
  reason:string;
};
export type ValidOverrideChange={
  targetMembershipId:string;
  operation:OverrideOperation;
  capability:Capability;
  scope:AccessScope;
  effect:OverrideEffect|null;
  expiresAt:string|null;
  reason:string;
};
export const OVERRIDE_BLOCKED_CAPABILITIES=[
  'newsroom.access','reader.personal','settings.security_admin',
  'team.view','team.invite','team.manage_roles','team.manage_overrides',
  'team.suspend','team.view_audit'
] as const;
const blocked:ReadonlySet<string>=new Set(OVERRIDE_BLOCKED_CAPABILITIES);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY=86400_000;
export function canOverrideCapability(value:string):value is Capability{
  return isCapability(value)&&!blocked.has(value)&&!value.startsWith('team.');
}
/** The server validates all submitted fields. Actor identity is NEVER sent by browser. */
export function validateOverrideChange(input:unknown,nowMs=Date.now()):ValidOverrideChange{
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid override request');
  const obj=input as Record<string,unknown>;
  const {targetMembershipId,operation,capability,scope,effect,expiresAt,reason}=obj;
  if(typeof targetMembershipId!=='string'||!uuid.test(targetMembershipId)
    ||(operation!=='set'&&operation!=='remove')
    ||typeof capability!=='string'||!canOverrideCapability(capability)
    ||(scope!=='all'&&scope!=='assigned'&&scope!=='own')
    ||typeof reason!=='string'||reason.trim().length<12||reason.length>500){
    throw Error('Invalid override fields');
  }
  if(operation==='set'&&EDITORIAL_OWN_PRIVILEGES.has(capability)&&scope!=='own')throw Error('Editorial privileges require own scope');
  if(operation==='remove'){
    if(effect!==undefined&&effect!==null)throw Error('Remove cannot change effect');
    if(expiresAt!==undefined&&expiresAt!==null)throw Error('Remove cannot set expiry');
    return {targetMembershipId,operation,capability,scope,effect:null,expiresAt:null,reason:reason.trim()};
  }
  if(effect!=='allow'&&effect!=='deny')throw Error('Expected allow/deny');
  if(expiresAt!==undefined&&expiresAt!==null&&typeof expiresAt!=='string')throw Error('Invalid expiry');
  const parsed=typeof expiresAt==='string'?Date.parse(expiresAt):NaN;
  if(effect==='allow'){
    if(!Number.isFinite(parsed)||parsed<nowMs+60*60_000||parsed>nowMs+90*DAY){
      throw Error('Temporary allow must expire within 1 hour to 90 days');
    }
  }else if(expiresAt!==undefined&&expiresAt!==null){
    if(!Number.isFinite(parsed)||parsed<=nowMs||parsed>nowMs+365*DAY){
      throw Error('Deny expiry outside accepted range');
    }
  }
  return {targetMembershipId,operation,capability,scope,effect,
    expiresAt:typeof expiresAt==='string'?new Date(parsed).toISOString():null,
    reason:reason.trim()};
}
