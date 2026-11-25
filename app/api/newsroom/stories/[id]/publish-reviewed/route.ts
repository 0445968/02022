import {NextResponse} from 'next/server';
import {publishReviewed,reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {reviewKind} from '@/lib/permissions/story-review-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!reviewedPublicationEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return reply({error:'Invalid publication'},422);
  const c=raw as Record<string,unknown>;
  if(Object.keys(c).length!==3||!reviewKind(c.kind)||typeof c.requestId!=='string'||!DRAFT_UUID.test(c.requestId)||typeof c.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(c.fingerprint))return reply({error:'Invalid publication'},422);
  return reply(await publishReviewed(params.id,c.kind,c.requestId,c.fingerprint));
 }catch(e){return reply({error:'Publication unavailable'},e instanceof DraftHttpError?e.status:503);}
}
