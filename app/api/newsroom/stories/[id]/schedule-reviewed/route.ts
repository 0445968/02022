import {NextResponse} from 'next/server';
import {readReviewedSchedule,changeReviewedSchedule,reviewedSchedulingEnabled} from '@/lib/services/reviewed-schedule';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {reviewKind} from '@/lib/permissions/story-review-contract';
import {parseScheduleCommand} from '@/lib/permissions/reviewed-schedule-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const failure=(e:unknown)=>reply({error:'Schedule unavailable'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!reviewedSchedulingEnabled())return reply({error:'Not found'},404);
 const kind=new URL(request.url).searchParams.get('kind');
 if(!reviewKind(kind))return reply({error:'Invalid kind'},422);
 try{return reply(await readReviewedSchedule(params.id,kind));}catch(e){return failure(e);}
}
export async function POST(request:Request,{params}:{params:{id:string}}){
 if(!reviewedSchedulingEnabled())return reply({error:'Not found'},404);
 try{const raw=await readDraftRequest(request);let c;
  try{c=parseScheduleCommand(raw);}catch{return reply({error:'Invalid command'},422);}
  return reply(await changeReviewedSchedule(params.id,c));
 }catch(e){return failure(e);}
}
