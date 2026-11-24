import {NextResponse} from 'next/server';
import {readInviteRequest,InviteRequestError} from '@/lib/permissions/staff-invite-http';
import {validateBylineReview} from '@/lib/permissions/staff-byline-input';
import {staffBylineReviewEnabled,listBylineRequests,listBylineCandidates,reviewStaffByline,BylineError} from '@/lib/services/staff-byline-review';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
function denied(error:unknown){return reply({error:'Byline review unavailable'},error instanceof BylineError||error instanceof InviteRequestError?error.status:503);}
export async function GET(request:Request){
  if(!staffBylineReviewEnabled())return reply({error:'Not found'},404);
  try{
    const query=new URL(request.url).searchParams,raw=query.get('page')??'0',member=query.get('member');
    if(!/^\d{1,3}$/.test(raw))return reply({error:'Invalid page'},400);
    return reply(member?await listBylineCandidates(member,Number(raw)):await listBylineRequests(Number(raw)));
  }catch(error){return denied(error);}
}
export async function POST(request:Request){
  if(!staffBylineReviewEnabled())return reply({error:'Not found'},404);
  try{
    const raw=await readInviteRequest(request);
    let input;
    try{input=validateBylineReview(raw);}catch{return reply({error:'Invalid review'},422);}
    return reply(await reviewStaffByline(input));
  }catch(error){return denied(error);}
}
