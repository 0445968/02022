import {NextResponse} from 'next/server';
import {mediaReferenceReview} from '@/lib/services/reader-account';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export async function GET(_:Request,{params}:{params:{id:string}}){
 try{return NextResponse.json(await mediaReferenceReview(params.id),{headers:{'Cache-Control':'private, no-store'}});}
 catch(e){return NextResponse.json({error:'Reference review unavailable.'},{status:e instanceof DraftHttpError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
