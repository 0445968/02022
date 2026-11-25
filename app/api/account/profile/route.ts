import {NextResponse} from 'next/server';
import {readReaderAccount,changeReaderAccount} from '@/lib/services/reader-account';
import {parseAccountCommand} from '@/lib/permissions/reader-account-contract';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
const fail=(e:unknown)=>reply({error:e instanceof DraftHttpError&&e.status===409?'Account changed or request already submitted; refresh.':'Account unavailable.'},e instanceof DraftHttpError?e.status:503);
export async function GET(){try{return reply(await readReaderAccount());}catch(e){return fail(e);}}
export async function POST(request:Request){try{const raw=await readDraftRequest(request);let c;try{c=parseAccountCommand(raw);}catch{return reply({error:'Invalid account command.'},422);}return reply(await changeReaderAccount(c));}catch(e){return fail(e);}}
