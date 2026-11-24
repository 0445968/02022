import {NextResponse} from 'next/server';
import {readReportQueue,readReportDetail,resolveCommentReport,reportManagementEnabled} from '@/lib/services/comment-reports';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {reportFilter,parseReportCommand} from '@/lib/permissions/comment-report-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const failure=(e:unknown)=>reply({error:'Report unavailable'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){
 if(!reportManagementEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,id=q.get('reportId'),status=q.get('status')??'open',page=q.get('page')??'0';
 try{if(id!==null)return reply(await readReportDetail(id));
  if(!reportFilter(status)||!/^\d{1,3}$/.test(page))return reply({error:'Invalid report filter'},422);
  return reply(await readReportQueue(status,q.get('storyId'),Number(page)));
 }catch(e){return failure(e);}
}
export async function POST(request:Request){
 if(!reportManagementEnabled())return reply({error:'Not found'},404);
 try{const raw=await readDraftRequest(request);let c;
  try{c=parseReportCommand(raw);}catch{return reply({error:'Invalid report command'},422);}
  return reply(await resolveCommentReport(c));
 }catch(e){return failure(e);}
}
