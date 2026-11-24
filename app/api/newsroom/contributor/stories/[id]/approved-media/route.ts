import {NextResponse} from 'next/server';
import {readAssignedApprovedMedia} from '@/lib/services/assigned-media';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request,{params}:{params:{id:string}}){
 const query=new URL(request.url).searchParams,mode=query.get('mode'),page=query.get('page')??'0';
 if((mode!=='draft'&&mode!=='revision')||!/^[0-9]{1,3}$/.test(page))return reply({error:'Invalid request'},422);
 try{return reply(await readAssignedApprovedMedia(params.id,mode==='revision',Number(page)));}
 catch(e){return reply({error:'Media unavailable'},e instanceof DraftHttpError?e.status:503);}
}
