import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {readPollPlacements,changePollPlacements,pollPlacementsEnabled} from '@/lib/services/poll-placements';
import {parsePlacementCommand} from '@/lib/permissions/poll-placement-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(_request:Request,props:{params:Promise<{id:string}>}){if(!pollPlacementsEnabled())return reply({error:'Not found'},404);try{return reply(await readPollPlacements((await props.params).id));}catch(e){return reply({error:'Placement unavailable'},e instanceof DraftHttpError?e.status:503);}}
export async function POST(request:Request,props:{params:Promise<{id:string}>}){if(!pollPlacementsEnabled())return reply({error:'Not found'},404);try{const raw=await readDraftRequest(request);let cmd;try{cmd=parsePlacementCommand(raw);}catch{return reply({error:'Invalid placement'},422);}return reply(await changePollPlacements((await props.params).id,cmd));}catch(e){return reply({error:'Placement unavailable'},e instanceof DraftHttpError?e.status:503);}}
