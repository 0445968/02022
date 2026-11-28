import {NextResponse} from 'next/server';
import {readAssignedDraft,writeAssignedDraft,assignedDraftEnabled} from '@/lib/services/assigned-drafts';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {validateDraftCommand} from '@/lib/permissions/assigned-draft-contract';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const denied=(error:unknown)=>reply({error:'Draft unavailable'},error instanceof DraftHttpError?error.status:503);
type Context={params: Promise<{id:string}>};
export async function GET(_request:Request, props:Context) {
 const params = await props.params;
 if(!assignedDraftEnabled())return reply({error:'Not found'},404);
 try{return reply(await readAssignedDraft(params.id));}catch(error){return denied(error);}
}
export async function PUT(request:Request, props:Context) {
 const params = await props.params;
 if(!assignedDraftEnabled())return reply({error:'Not found'},404);
 try{
   const raw=await readDraftRequest(request);
   let command;
   try{command=validateDraftCommand(raw);}catch{return reply({error:'Invalid copy'},422);}
   return reply(await writeAssignedDraft(params.id,command));
 }catch(error){return denied(error);}
}
