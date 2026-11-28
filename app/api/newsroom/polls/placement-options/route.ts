import {NextResponse} from 'next/server';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {lookupPollPlacementTargets,pollPlacementsEnabled} from '@/lib/services/poll-placements';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){if(!pollPlacementsEnabled())return reply({error:'Not found'},404);const q=new URL(request.url).searchParams,kind=q.get('kind'),page=q.get('page')??'0';if((kind!=='article'&&kind!=='category')||!/^\d{1,3}$/.test(page))return reply({error:'Invalid lookup'},422);try{return reply(await lookupPollPlacementTargets(kind,q.get('q')??'',Number(page)));}catch(e){return reply({error:'Lookup unavailable'},e instanceof DraftHttpError?e.status:503);}}
