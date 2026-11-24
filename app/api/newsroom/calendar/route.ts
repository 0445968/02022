import {NextResponse} from 'next/server';
import {editorialCalendarEnabled,readEditorialCalendar} from '@/lib/services/editorial-calendar';
import {parseCalendarQuery} from '@/lib/permissions/editorial-calendar-contract';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 if(!editorialCalendarEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,raw=q.get('page')??'0';
 try{
  if(!/^\d{1,3}$/.test(raw))return reply({error:'Invalid filter'},422);
  let input;try{input=parseCalendarQuery({start:q.get('start'),end:q.get('end'),mode:q.get('mode')??'range',filter:q.get('filter')??'all',page:Number(raw)});}catch{return reply({error:'Invalid filter'},422);}
  return reply(await readEditorialCalendar(input));
 }catch(e){return reply({error:'Calendar unavailable'},e instanceof DraftHttpError?e.status:503);}
}
