import {NextResponse} from 'next/server';
import {storyReviewEnabled,readStoryReview,changeStoryReview} from '@/lib/services/story-review';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {reviewKind,validateReviewCommand} from '@/lib/permissions/story-review-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const denied=(e:unknown)=>reply({error:'Review unavailable'},e instanceof DraftHttpError?e.status:503);
type Context={params: Promise<{id:string}>};
export async function GET(request:Request, props:Context) {
 const params = await props.params;
 if(!storyReviewEnabled())return reply({error:'Not found'},404);
 const kind=new URL(request.url).searchParams.get('kind');
 if(!reviewKind(kind))return reply({error:'Invalid kind'},422);
 try{return reply(await readStoryReview(params.id,kind));}catch(e){return denied(e);}
}
export async function POST(request:Request, props:Context) {
 const params = await props.params;
 if(!storyReviewEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let command;
  try{command=validateReviewCommand(raw);}catch{return reply({error:'Invalid command'},422);}
  return reply(await changeStoryReview(params.id,command));
 }catch(e){return denied(e);}
}
