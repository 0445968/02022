import {NextResponse} from 'next/server';
import {sendDigestBatch} from '@/lib/services/newsletter-mail';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return NextResponse.json(await sendDigestBatch(request.headers.get('authorization')),{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:'Worker unavailable'},{status:e instanceof DraftHttpError?e.status:503});}}
