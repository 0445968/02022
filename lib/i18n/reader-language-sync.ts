import {LOCALE_COOKIE} from '@/lib/i18n/config';
import type {NextResponse} from 'next/server';
export function readerLanguageSyncEnabled(){return process.env.CT_READER_LANGUAGE_SYNC_ENABLED==='true'&&process.env.CT_READER_ACCOUNT_ENABLED==='true'&&process.env.DEV_AUTH_BYPASS!=='true';}
export function applyReaderLanguageCookie(response:NextResponse,locale:'en'|'es',request:Request){response.cookies.set(LOCALE_COOKIE,locale,{path:'/',maxAge:60*60*24*365,sameSite:'lax',secure:new URL(request.url).protocol==='https:'});return response;}
