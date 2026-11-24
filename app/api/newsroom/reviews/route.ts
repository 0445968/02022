import {NextResponse} from 'next/server';
import {readReviewInbox,acknowledgeReviewFeedback,reviewInboxEnabled} from '@/lib/services/review-inbox';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {inboxMode,parseFeedbackAck} from '@/lib/permissions/review-inbox-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const failure=(e:unknown)=>reply({error:'Inbox unavailable'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){
 if(!reviewInboxEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,mode=q.get('mode')??'pending',page=q.get('page')??'0';
 if(!inboxMode(mode)||!/^\d{1,3}$/.test(page))return reply({error:'Invalid inbox page'},422);
 try{return reply(await readReviewInbox(mode,Number(page)));}catch(e){return failure(e);}
}
export async function POST(request:Request){
 if(!reviewInboxEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let id:string;
  try{id=parseFeedbackAck(raw);}catch{return reply({error:'Invalid acknowledgement'},422);}
  return reply(await acknowledgeReviewFeedback(id));
 }catch(e){return failure(e);}
}
