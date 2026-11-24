import {NextResponse} from 'next/server';
import {bulkModerationEnabled,changeBulkModeration} from '@/lib/services/comment-moderation';
import {parseBulkModerationCommand} from '@/lib/permissions/comment-bulk-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request){
 if(!bulkModerationEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let c;
  try{c=parseBulkModerationCommand(raw);}catch{return reply({error:'Invalid batch'},422);}
  return reply(await changeBulkModeration(c));
 }catch(e){return reply({error:'Batch unavailable'},e instanceof DraftHttpError?e.status:503);}
}
