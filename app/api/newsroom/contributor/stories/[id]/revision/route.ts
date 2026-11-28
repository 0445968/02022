import {NextResponse} from 'next/server';
import {readAssignedRevision,saveAssignedRevision,assignedRevisionEnabled} from '@/lib/services/assigned-revisions';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {validateRevisionCommand} from '@/lib/permissions/assigned-revision-contract';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const denied=(e:unknown)=>reply({error:'Revision unavailable'},e instanceof DraftHttpError?e.status:503);
type Context={params: Promise<{id:string}>};
export async function GET(_request:Request, props:Context) {
 const params = await props.params;
 if(!assignedRevisionEnabled())return reply({error:'Not found'},404);
 try{return reply(await readAssignedRevision(params.id));}catch(e){return denied(e);}
}
export async function PUT(request:Request, props:Context) {
 const params = await props.params;
 if(!assignedRevisionEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);
  let command;
  try{command=validateRevisionCommand(raw);}catch{return reply({error:'Invalid copy'},422);}
  return reply(await saveAssignedRevision(params.id,command));
 }catch(e){return denied(e);}
}
