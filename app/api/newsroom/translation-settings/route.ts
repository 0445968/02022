import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {parseTerminologyCommand} from '@/lib/permissions/translation-terminology-contract';
import {terminologyEnabled,readTerminology,saveTerminology} from '@/lib/services/translation-terminology';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(){if(!terminologyEnabled())return reply({error:'Not found'},404);try{return reply(await readTerminology());}catch(e){return reply({error:'Terminology unavailable'},e instanceof DraftHttpError?e.status:503);}}
export async function POST(request:Request){if(!terminologyEnabled())return reply({error:'Not found'},404);try{const raw=await readDraftRequest(request);let command;try{command=parseTerminologyCommand(raw);}catch{return reply({error:'Invalid terminology'},422);}return reply(await saveTerminology(command));}catch(e){return reply({error:'Terminology unavailable'},e instanceof DraftHttpError?e.status:503);}}
