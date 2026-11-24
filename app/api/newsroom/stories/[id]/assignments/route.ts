import {NextResponse} from 'next/server';
import {assignmentManagementEnabled,readStoryAssignments,changeStoryAssignment} from '@/lib/services/story-assignments';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {validateAssignmentCommand} from '@/lib/permissions/story-assignment-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const denied=(e:unknown)=>reply({error:'Assignment unavailable'},e instanceof DraftHttpError?e.status:503);
type Context={params:{id:string}};
export async function GET(request:Request,{params}:Context){
 if(!assignmentManagementEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,page=q.get('page')??'0',candidate=q.get('candidatePage')??'0';
 if(!/^\d{1,3}$/.test(page)||!/^\d{1,3}$/.test(candidate))return reply({error:'Invalid page'},422);
 try{return reply(await readStoryAssignments(params.id,Number(page),Number(candidate)));}catch(e){return denied(e);}
}
export async function POST(request:Request,{params}:Context){
 if(!assignmentManagementEnabled())return reply({error:'Not found'},404);
 try{
   const raw=await readDraftRequest(request);
   let command;
   try{command=validateAssignmentCommand(raw);}catch{return reply({error:'Invalid command'},422);}
   return reply(await changeStoryAssignment(params.id,command));
 }catch(e){return denied(e);}
}
