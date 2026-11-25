import {NextResponse} from 'next/server';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseReaderReportCommand} from '@/lib/permissions/reader-report-contract';
import {readerReportingEnabled,submitReaderReport} from '@/lib/services/reader-reports';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!readerReportingEnabled())return reply({error:'Not found'},404);
 try{
  const raw=await readDraftRequest(request);let c;
  try{c=parseReaderReportCommand(raw);}catch{return reply({error:'Invalid report'},422);}
  return reply(await submitReaderReport(params.id,c));
 }catch(e){return reply({error:'Report unavailable'},e instanceof DraftHttpError?e.status:503);}
}
