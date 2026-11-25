import {NextResponse} from 'next/server';
import {readNotices,changeNotices} from '@/lib/services/reader-communications';
import {parseNoticeCommand} from '@/lib/permissions/reader-communications-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(e:unknown)=>reply({error:'Notifications unavailable. Refresh before retrying.'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){try{return reply(await readNotices(Number(new URL(request.url).searchParams.get('page')??0)));}catch(e){return fail(e);}}
export async function POST(request:Request){try{const raw=await readDraftRequest(request);let c;try{c=parseNoticeCommand(raw);}catch{return reply({error:'Invalid command'},422);}return reply(await changeNotices(c));}catch(e){return fail(e);}}
