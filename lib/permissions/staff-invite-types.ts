export type StaffInviteRow={
  invitationId:string;emailHint:string;roleKey:string;memberType:string;
  presetRevision:number;status:'pending'|'expired'|'canceled'|'redeemed'|'invalidated';
  issuedAt:string;expiresAt:string;membershipExpiresAt:string|null;
};
export type StaffInviteDirectory={items:StaffInviteRow[];page:number;hasMore:boolean};
