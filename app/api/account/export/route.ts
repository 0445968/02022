import {NextResponse} from 'next/server';
import {readerExport} from '@/lib/services/reader-account';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
export const dynamic='force-dynamic';
export async function GET(){
 try{return new Response(JSON.stringify(await readerExport(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="clear-talks-reader-snapshot.json"','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});}
 catch(e){return NextResponse.json({error:'Export unavailable.'},{status:e instanceof DraftHttpError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
