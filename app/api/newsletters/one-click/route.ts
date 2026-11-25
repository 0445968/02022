import {NextResponse} from 'next/server';
import {handleNewsletterLink} from '@/lib/services/newsletter-mail';
export async function POST(request:Request){
 try{const token=new URL(request.url).searchParams.get('token');
 if(!token||token.length>200||request.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded'||Number(request.headers.get('content-length')??999)>100)return new Response(null,{status:400});
 const body=await request.text();if(body!=='List-Unsubscribe=One-Click')return new Response(null,{status:400});
 const ok=await handleNewsletterLink('unsubscribe',token);return new Response(null,{status:ok?200:422,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return NextResponse.json({ok:false},{status:503});}
}
