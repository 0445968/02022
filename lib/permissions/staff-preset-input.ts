import {isCapability,type Capability,type AccessScope} from '@/lib/permissions/capabilities';
import {STAFF_ROLE_KEYS,type StaffRoleKey} from '@/lib/permissions/staff-admin-input';
import {proposedRoleGrants} from '@/lib/permissions/role-presets';

export type PresetGrant={capability:Capability;scope:AccessScope};
export type PresetGrantChange={
  roleKey:StaffRoleKey;expectedRevision:number;
  grants:PresetGrant[];reason:string;confirmed:true;
};
const roleSet:ReadonlySet<string>=new Set(STAFF_ROLE_KEYS);
const protectedCap=(key:string)=>key.startsWith('team.')
  ||['settings.security_admin','reader.personal','byline.manage'].includes(key);

export function editablePresetCapabilities(role:StaffRoleKey):readonly PresetGrant[]{
  if(role==='owner')return [];
  return proposedRoleGrants(role).filter(grant=>!protectedCap(grant.capability))
    .map(grant=>({capability:grant.capability,scope:grant.scope}));
}
export function validatePresetGrantChange(raw:unknown):PresetGrantChange{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid preset request');
  const body=raw as Record<string,unknown>;
  const {roleKey,expectedRevision,grants,reason,confirmed}=body;
  if(typeof roleKey!=='string'||!roleSet.has(roleKey)||roleKey==='owner'
    ||!Number.isSafeInteger(expectedRevision)||Number(expectedRevision)<0
    ||typeof reason!=='string'||reason.trim().length<12||reason.length>500
    ||confirmed!==true||!Array.isArray(grants)||grants.length>47){
    throw Error('Invalid role preset change');
  }
  const role=roleKey as StaffRoleKey;
  const allowed=new Map(editablePresetCapabilities(role).map(g=>[g.capability,g.scope]));
  const seen=new Set<string>();
  const chosen:PresetGrant[]=[];
  for(const item of grants){
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid grant');
    const object=item as Record<string,unknown>;
    const keys=Object.keys(object);
    if(keys.length!==2||!keys.includes('capability')||!keys.includes('scope')
      ||typeof object.capability!=='string'||!isCapability(object.capability)
      ||typeof object.scope!=='string'||allowed.get(object.capability)!==object.scope
      ||seen.has(object.capability)){
      throw Error('Unknown, duplicate, or unsafe capability/scope');
    }
    seen.add(object.capability);
    chosen.push({capability:object.capability,scope:object.scope as AccessScope});
  }
  chosen.sort((a,b)=>a.capability.localeCompare(b.capability));
  return {
    roleKey:role,expectedRevision:expectedRevision as number,
    grants:chosen,reason:reason.trim(),confirmed:true
  };
}
