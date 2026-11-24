import 'server-only';
import {randomUUID} from 'node:crypto';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient as createSessionClient} from '@/lib/db/supabase-server';
import {isDevAuthBypass} from '@/lib/db/supabase-data';
import {resolveStaffPermissionOnServer} from '@/lib/permissions/server';
import {createInviteToken} from '@/lib/permissions/staff-invitation-contract';
import {INVITE_UUID,type InviteCommand} from '@/lib/permissions/staff-invite-http';
import type {StaffInviteDirectory,StaffInviteRow} from '@/lib/permissions/staff-invite-types';

export function staffInvitationsEnabled(){
  return process.env.CT_STAFF_ACCESS_V2_ENABLED==='true'
    &&process.env.CT_STAFF_ADMIN_MUTATIONS_ENABLED==='true'
    &&process.env.CT_STAFF_INVITATIONS_ENABLED==='true'&&!isDevAuthBypass();
}
function serviceClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new InviteServiceError(503);
  return createServiceClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export class InviteServiceError extends Error{
  constructor(public readonly status:number){super('Invitation operation unavailable');}
}
export async function verifiedInvitationUser(){
  if(!staffInvitationsEnabled())return null;
  const session=createSessionClient();
  const {data:{user},error}=await session.auth.getUser();
  if(error||!user||!INVITE_UUID.test(user.id)||!user.email||!user.email_confirmed_at||
    !Number.isFinite(Date.parse(user.email_confirmed_at))||
    Date.parse(user.email_confirmed_at)>Date.now()||user.is_anonymous!==false)return null;
  return {id:user.id};
}
/** Fresh cookie identity + current team.invite grant, then independent Owner DB assertion. */
async function invitationOwner(){
  const user=await verifiedInvitationUser();
  if(!user)throw new InviteServiceError(403);
  if(!(await resolveStaffPermissionOnServer('team.invite')).allowed)
    throw new InviteServiceError(403);
  const fresh=await verifiedInvitationUser();
  if(!fresh||fresh.id!==user.id)throw new InviteServiceError(403);
  const db=serviceClient();
  const {data,error}=await db.rpc('staff_invite_owner_allowed',{p_actor:fresh.id});
  if(error||data!==true)throw new InviteServiceError(403);
  return {db,actor:fresh.id};
}
export async function canManageStaffInvitations(){
  try{await invitationOwner();return true;}catch{return false;}
}
function rejectRpc(code:string|undefined,redeem=false):never{
  // Never return SQL details, email, token, hash, or existence information.
  if(redeem)throw new InviteServiceError(403);
  if(code==='40001'||code==='23505')throw new InviteServiceError(409);
  if(code==='54000')throw new InviteServiceError(429);
  if(code==='22023')throw new InviteServiceError(422);
  if(code==='42501')throw new InviteServiceError(403);
  throw new InviteServiceError(503);
}
export async function listStaffInvitations(page:number):Promise<StaffInviteDirectory>{
  if(!Number.isInteger(page)||page<0||page>100)throw new InviteServiceError(400);
  const {db,actor}=await invitationOwner();
  const {data,error}=await db.rpc('staff_list_invitations',{p_actor:actor,p_page:page});
  if(error)rejectRpc(error.code);
  if(!Array.isArray(data)||data.length>26)throw new InviteServiceError(503);
  const items:StaffInviteRow[]=data.slice(0,25).map((r:Record<string,unknown>)=>{
    if(typeof r.invitation_id!=='string'||!INVITE_UUID.test(r.invitation_id)||
      typeof r.email_hint!=='string'||!['pending','expired','canceled','redeemed','invalidated'].includes(String(r.status)))
      throw new InviteServiceError(503);
    return {invitationId:r.invitation_id,emailHint:r.email_hint,
      roleKey:String(r.role_key),memberType:String(r.member_type),presetRevision:Number(r.preset_revision),
      status:r.status as StaffInviteRow['status'],issuedAt:String(r.issued_at),
      expiresAt:String(r.expires_at),membershipExpiresAt:typeof r.membership_expires_at==='string'?r.membership_expires_at:null};
  });
  return {items,page,hasMore:data.length>25&&page<100};
}
export async function executeStaffInvitation(command:InviteCommand){
  if(!staffInvitationsEnabled())throw new InviteServiceError(404);
  const requestId=randomUUID();
  if(command.action==='redeem'){
    // A reader MUST be able to redeem without already possessing staff rights.
    // Actor comes from Auth only, and the RPC repeats eligibility checks atomically.
    const user=await verifiedInvitationUser();
    if(!user)throw new InviteServiceError(403);
    const db=serviceClient();
    const {data,error}=await db.rpc('staff_redeem_invitation',{
      p_verified_auth_user_id:user.id,p_token_hash:command.tokenHash,p_request_id:requestId});
    if(error||typeof data!=='string'||!INVITE_UUID.test(data))rejectRpc(error?.code,true);
    return {ok:true as const};
  }
  const {db,actor}=await invitationOwner();
  if(command.action==='cancel'){
    const {data,error}=await db.rpc('staff_cancel_invitation',{
      p_actor:actor,p_invitation_id:command.id,p_reason:command.reason,p_request_id:requestId});
    if(error||data!==command.id)rejectRpc(error?.code);
    return {ok:true as const};
  }
  const {input,replaceId}=command;
  const {token,tokenHash}=createInviteToken();
  const {data,error}=await db.rpc('staff_issue_invitation',{
    p_actor:actor,p_email:input.email,p_role:input.roleKey,p_expected_revision:input.expectedPresetRevision,
    p_member_type:input.memberType,p_expires_at:input.expiresAt,
    p_membership_expires_at:input.membershipExpiresAt,p_token_hash:tokenHash,
    p_replace_id:replaceId,p_reason:input.reason,p_request_id:requestId});
  if(error||typeof data!=='string'||!INVITE_UUID.test(data))rejectRpc(error?.code);
  // Only the successful authorized issuer receives the raw code, once.
  // No storage/logging/email. Lost responses require explicit replacement.
  return {ok:true as const,code:token,invitationId:data,delivery:'manual' as const};
}
