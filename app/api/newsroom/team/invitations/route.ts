import {NextResponse} from 'next/server';
import {InviteRequestError,readInviteRequest,validateInviteCommand} from '@/lib/permissions/staff-invite-http';
import {staffInvitationsEnabled,listStaffInvitations,executeStaffInvitation,InviteServiceError} from '@/lib/services/staff-invitations';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store, private, max-age=0','Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff'};
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
function errorResponse(error:unknown){
  return reply({error:'Invitation operation unavailable'},error instanceof InviteRequestError||
    error instanceof InviteServiceError?error.status:503);
}
export async function GET(request:Request){
  if(!staffInvitationsEnabled())return reply({error:'Not found'},404);
  try{
    const raw=new URL(request.url).searchParams.get('page')??'0';
    if(!/^\d{1,3}$/.test(raw))return reply({error:'Invalid page'},400);
    return reply(await listStaffInvitations(Number(raw)));
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  if(!staffInvitationsEnabled())return reply({error:'Not found'},404);
  try{
    const raw=await readInviteRequest(request);
    let command;
    try{command=validateInviteCommand(raw);}catch{return reply({error:'Invalid invitation request'},422);}
    return reply(await executeStaffInvitation(command));
  }catch(error){return errorResponse(error);}
}
