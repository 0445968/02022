import {NextResponse} from 'next/server';
import {lookupWorkAssignmentOptions,workOverviewEnabled} from '@/lib/services/work-assignments';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 if(!workOverviewEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,kind=q.get('kind'),page=q.get('page')??'0';
 if((kind!=='article'&&kind!=='member')||!/^\d{1,3}$/.test(page))return reply({error:'Invalid query'},422);
 try{return reply(await lookupWorkAssignmentOptions(kind,q.get('q')??'',Number(page)));}catch(e){return reply({error:'Lookup unavailable'},e instanceof DraftHttpError?e.status:503);}
}
