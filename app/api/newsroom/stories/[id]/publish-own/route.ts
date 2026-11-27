import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export const dynamic='force-dynamic';
import {publishOwnStory,editorialPrivilegesEnabled} from '@/lib/services/editorial-privileges';
import {validateSelfPublication} from '@/lib/permissions/editorial-privilege-contract';
export async function POST(request:Request,props:{params:Promise<{id:string}>}){
 if(!editorialPrivilegesEnabled())return reply({error:'Not found'},404);
 try{const raw=await readDraftRequest(request);let command;try{command=validateSelfPublication(raw);}catch{return reply({error:'Invalid command'},422);}return reply(await publishOwnStory((await props.params).id,command));}catch(e){return reply({error:'Publication unavailable'},e instanceof DraftHttpError?e.status:503);}
}
