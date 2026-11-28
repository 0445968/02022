import {NextResponse} from 'next/server';
import {readReaderAccount} from '@/lib/services/reader-account';
import {readerLanguageSyncEnabled,applyReaderLanguageCookie} from '@/lib/i18n/reader-language-sync';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){if(!readerLanguageSyncEnabled())return reply({error:'Not found'},404);try{const state=await readReaderAccount();return applyReaderLanguageCookie(reply({locale:state.locale}),state.locale,request);}catch(e){return reply({error:'Language unavailable'},e instanceof DraftHttpError?e.status:503);}}
