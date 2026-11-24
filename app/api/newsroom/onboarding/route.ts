import {NextResponse} from 'next/server';
import {readInviteRequest,InviteRequestError} from '@/lib/permissions/staff-invite-http';
import {validateStaffOnboarding} from '@/lib/permissions/staff-onboarding-input';
import {staffOnboardingEnabled,readStaffOnboarding,saveStaffOnboarding,StaffOnboardingError} from '@/lib/services/staff-onboarding';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
function denied(error:unknown){
  return reply({error:'Staff onboarding unavailable'},error instanceof StaffOnboardingError||error instanceof InviteRequestError?error.status:503);
}
export async function GET(){
  if(!staffOnboardingEnabled())return reply({error:'Not found'},404);
  try{return reply(await readStaffOnboarding());}catch(error){return denied(error);}
}
export async function POST(request:Request){
  if(!staffOnboardingEnabled())return reply({error:'Not found'},404);
  try{
    const raw=await readInviteRequest(request);
    let input;
    try{input=validateStaffOnboarding(raw);}catch{return reply({error:'Invalid profile'},422);}
    return reply(await saveStaffOnboarding(input));
  }catch(error){return denied(error);}
}
