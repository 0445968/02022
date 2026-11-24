import {NextResponse} from 'next/server';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {readerReportingEnabled,readOwnReports} from '@/lib/services/reader-reports';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 if(!readerReportingEnabled())return reply({error:'Not found'},404);
 const page=new URL(request.url).searchParams.get('page')??'0';
 if(!/^\d{1,3}$/.test(page))return reply({error:'Invalid page'},422);
 try{return reply(await readOwnReports(Number(page)));}catch(e){return reply({error:'Reports unavailable'},e instanceof DraftHttpError?e.status:503);}
}
