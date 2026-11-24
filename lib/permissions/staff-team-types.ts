import type { StaffRoleKey } from '@/lib/permissions/staff-admin-input';

export type TeamStatus='invited'|'active'|'suspended'|'revoked';
export type TeamRoleAssignment={
  roleKey:StaffRoleKey; grantedAt:string; expiresAt:string|null;
};
export type TeamMember={
  id:string; name:string; memberType:'employee'|'contractor'|'freelancer';
  status:TeamStatus; expiresAt:string|null; joinedAt:string;
  isSelf:boolean; roles:TeamRoleAssignment[];
};
export type TeamPreset={
  key:StaffRoleKey; nameEn:string; nameEs:string; isBuiltin:boolean;
  configuredGrants:{capability:string;scope:'all'|'assigned'|'own'}[];
};
export type TeamAuditEntry={
  id:string;subjectMembershipId:string|null;
  action:string;reason:string|null;occurredAt:string;
  actorName:string;
};
export type TeamDirectory={
  members:TeamMember[];presets:TeamPreset[];audit:TeamAuditEntry[];
  totalMembers:number;hasMoreMembers:boolean;
  canManageRoles:boolean;canViewAudit:boolean;
  mutationsEnabled:boolean;
};
