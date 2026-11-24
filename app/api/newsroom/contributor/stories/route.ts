import {NextResponse} from 'next/server';
import {writerCreationEnabled,startWriterDraft} from '@/lib/services/writer-drafts';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {validateWriterDraft} from '@/lib/permissions/writer-draft-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request){
 if(!writerCreationEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let input;
  try{input=validateWriterDraft(raw);}catch{return reply({error:'Invalid draft'},422);}
  return reply({id:await startWriterDraft(input)},201);
 }catch(e){return reply({error:'Draft creation unavailable'},e instanceof DraftHttpError?e.status:503);}
}
