import {NextResponse} from 'next/server';
import {mediaReferenceReview} from '@/lib/services/reader-account';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export async function GET(_:Request, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 try{return NextResponse.json(await mediaReferenceReview(params.id),{headers:{'Cache-Control':'private, no-store'}});}
 catch(e){return NextResponse.json({error:'Reference review unavailable.'},{status:e instanceof DraftHttpError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
