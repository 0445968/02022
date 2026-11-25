import {NextResponse} from 'next/server';
import {createClient} from '@/lib/db/supabase-server';
import {readerAccountEnabled} from '@/lib/services/reader-account';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url),locale=url.searchParams.get('locale')==='es'?'es':'en',code=url.searchParams.get('code');
 const failed=()=>{const response=NextResponse.redirect(new URL('/'+locale+'/auth/recovery-result?status=unavailable',url.origin));response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;};
 if(!readerAccountEnabled()||!code||code.length>4096||url.searchParams.has('error'))return failed();
 try{
  const db=createClient();const {data,error}=await db.auth.exchangeCodeForSession(code);
  if(error||!data.user||data.user.is_anonymous)return failed();
  const response=NextResponse.redirect(new URL('/account/security'+(url.searchParams.get('purpose')==='recovery'?'?recovery=1':''),url.origin));
  response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch{return failed();}
}
