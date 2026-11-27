import {NextResponse} from 'next/server';
import {workAssignmentsEnabled,readWorkAssignments,changeWorkAssignment} from '@/lib/services/work-assignments';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {validateStandaloneAssignmentCommand} from '@/lib/permissions/standalone-assignment-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const denied=(e:unknown)=>reply({error:'Assignment unavailable'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){
 if(!workAssignmentsEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,mode=q.get('mode')??'personal',page=q.get('page')??'0';
 if((mode!=='team'&&mode!=='personal')||!/^\d{1,3}$/.test(page))return reply({error:'Invalid query'},422);
 try{return reply(await readWorkAssignments(mode,Number(page),q.get('id')));}catch(e){return denied(e);}
}
export async function POST(request:Request){
 if(!workAssignmentsEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let cmd;
  try{cmd=validateStandaloneAssignmentCommand(raw);}catch{return reply({error:'Invalid command'},422);}
  return reply(await changeWorkAssignment(cmd));
 }catch(e){return denied(e);}
}
