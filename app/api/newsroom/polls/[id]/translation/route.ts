import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {readPollTranslation,changePollTranslation,pollTranslationsEnabled} from '@/lib/services/poll-translations';
import {parsePollTranslationCommand} from '@/lib/permissions/poll-translation-contract';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(_request:Request,props:{params:Promise<{id:string}>}){if(!pollTranslationsEnabled())return reply({error:'Not found'},404);try{return reply(await readPollTranslation((await props.params).id));}catch(e){return reply({error:'Translation unavailable'},e instanceof DraftHttpError?e.status:503);}}
export async function POST(request:Request,props:{params:Promise<{id:string}>}){if(!pollTranslationsEnabled())return reply({error:'Not found'},404);try{const raw=await readDraftRequest(request);let command;try{command=parsePollTranslationCommand(raw);}catch{return reply({error:'Invalid translation'},422);}return reply(await changePollTranslation((await props.params).id,command));}catch(e){return reply({error:'Translation unavailable'},e instanceof DraftHttpError?e.status:503);}}
