import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {storyTranslationsEnabled,readStoryTranslation,changeStoryTranslation} from '@/lib/services/story-translations';
import {parseTranslationCommand} from '@/lib/permissions/translation-workflow-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(_request:Request,props:{params:Promise<{id:string}>}){if(!storyTranslationsEnabled())return reply({error:'Not found'},404);try{return reply(await readStoryTranslation((await props.params).id));}catch(e){return reply({error:'Translation unavailable'},e instanceof DraftHttpError?e.status:503);}}
export async function POST(request:Request,props:{params:Promise<{id:string}>}){if(!storyTranslationsEnabled())return reply({error:'Not found'},404);try{const raw=await readDraftRequest(request);let command;try{command=parseTranslationCommand(raw);}catch{return reply({error:'Invalid translation command'},422);}return reply(await changeStoryTranslation((await props.params).id,command));}catch(e){return reply({error:'Translation unavailable'},e instanceof DraftHttpError?e.status:503);}}
