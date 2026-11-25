import {NextResponse} from 'next/server';
import {readVersionedHomepage,changeVersionedHomepage} from '@/lib/services/homepage-history';
import {parseLayoutCommand} from '@/lib/permissions/homepage-history-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(e:unknown)=>reply({error:e instanceof DraftHttpError&&e.status===409?'Layout changed or legacy placements need review. Reload before retrying.':'Layout unavailable.'},e instanceof DraftHttpError?e.status:503);
export async function GET(){try{return reply(await readVersionedHomepage());}catch(e){return fail(e);}}
export async function POST(request:Request){
 try{const raw=await readDraftRequest(request);let command;try{command=parseLayoutCommand(raw);}catch{return reply({error:'Invalid layout command'},422);}return reply(await changeVersionedHomepage(command));}catch(e){return fail(e);}
}
