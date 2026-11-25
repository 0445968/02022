import {NextResponse} from 'next/server';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {handleNewsletterLink} from '@/lib/services/newsletter-mail';
export async function POST(request:Request){try{
 const raw=await readDraftRequest(request) as Record<string,unknown>|null;
 if(!raw||Object.keys(raw).length!==2||(raw.action!=='confirm'&&raw.action!=='unsubscribe')||typeof raw.token!=='string'||raw.token.length>200)return NextResponse.json({ok:false},{status:422});
 const ok=await handleNewsletterLink(raw.action,raw.token);return NextResponse.json({ok},{status:ok?200:422,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch(e){return NextResponse.json({ok:false},{status:e instanceof DraftHttpError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}}
