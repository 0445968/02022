import type {Capability,AccessScope} from '@/lib/permissions/capabilities';

export type MemberOverride={
  id:string;capability:Capability;scope:AccessScope;effect:'allow'|'deny';
  expiresAt:string|null;reason:string;
};
export type MemberEffectiveRow={
  capability:Capability;
  state:'allowed'|'denied'|'conditional';
  explanation:string;
};
export type MemberEffectiveAccess={
  membershipId:string;asOf:string;status:string;
  overrides:MemberOverride[];
  permissions:MemberEffectiveRow[];
  note:string;
};
