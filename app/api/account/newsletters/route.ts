import {NextResponse} from 'next/server';
import {readNewsletters,unsubscribeTopic} from '@/lib/services/reader-communications';
import {requestNewsletter} from '@/lib/services/newsletter-mail';
import {parseNewsletterCommand} from '@/lib/permissions/reader-communications-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(e:unknown)=>reply({error:'Newsletter action unavailable. Refresh before retrying.'},e instanceof DraftHttpError?e.status:503);
export async function GET(){try{return reply(await readNewsletters());}catch(e){return fail(e);}}
export async function POST(request:Request){try{const raw=await readDraftRequest(request);let c;try{c=parseNewsletterCommand(raw);}catch{return reply({error:'Invalid command'},422);}return reply(c.action==='subscribe'?await requestNewsletter(c.topic):await unsubscribeTopic(c.topic));}catch(e){return fail(e);}}
