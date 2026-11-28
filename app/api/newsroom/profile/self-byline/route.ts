import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export const dynamic='force-dynamic';
import {linkSelfByline,editorialPrivilegesEnabled} from '@/lib/services/editorial-privileges';
import {validateSelfByline} from '@/lib/permissions/editorial-privilege-contract';
export async function POST(request:Request){
 if(!editorialPrivilegesEnabled())return reply({error:'Not found'},404);
 try{const raw=await readDraftRequest(request);let command;try{command=validateSelfByline(raw);}catch{return reply({error:'Invalid command'},422);}return reply(await linkSelfByline(command));}catch(e){return reply({error:'Byline unavailable'},e instanceof DraftHttpError?e.status:503);}
}
