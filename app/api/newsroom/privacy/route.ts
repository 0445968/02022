import {NextResponse} from 'next/server';
import {privacyQueue,reviewPrivacyRequest} from '@/lib/services/reader-account';
import {parsePrivacyReview} from '@/lib/permissions/reader-account-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(e:unknown)=>reply({error:'Privacy request unavailable. Refresh before retrying.'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){try{return reply(await privacyQueue(Number(new URL(request.url).searchParams.get('page')??0)));}catch(e){return fail(e);}}
export async function POST(request:Request){try{const raw=await readDraftRequest(request);let c;try{c=parsePrivacyReview(raw);}catch{return reply({error:'Invalid review.'},422);}return reply(await reviewPrivacyRequest(c));}catch(e){return fail(e);}}
