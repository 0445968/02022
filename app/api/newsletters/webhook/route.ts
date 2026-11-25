import {NextResponse} from 'next/server';
import {handleMailWebhook} from '@/lib/services/newsletter-mail';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export async function POST(request:Request){
 try{if(!request.body)return new Response(null,{status:400});const reader=request.body.getReader(),chunks:Uint8Array[]=[];let n=0;
 while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>65536){await reader.cancel();return new Response(null,{status:413});}chunks.push(value);}
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 await handleMailWebhook(raw,{id:request.headers.get('svix-id')??'',timestamp:request.headers.get('svix-timestamp')??'',signature:request.headers.get('svix-signature')??''});return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({ok:false},{status:e instanceof DraftHttpError?e.status:503});}
}
