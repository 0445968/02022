import {NextResponse} from 'next/server';
import {getStaffTeamAccess,readStaffTeamDirectory} from '@/lib/services/staff-team-directory';

export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const access=await getStaffTeamAccess();
    if(!access.allowed){
      return NextResponse.json({error:'Not found'},{status:404});
    }
    const url=new URL(request.url);
    const numberParam=(key:string)=>{
      const raw=url.searchParams.get(key)??'0';
      return /^\\d{1,3}$/.test(raw)?Math.min(Number(raw),100):0;
    };
    const directory=await readStaffTeamDirectory(access,{
      page:numberParam('page'),auditPage:numberParam('auditPage'),
      status:url.searchParams.get('status')??undefined,
      auditMemberId:url.searchParams.get('auditMemberId')??undefined
    });
    return NextResponse.json(directory,{headers:{'Cache-Control':'private, no-store, max-age=0'}});
  }catch{
    return NextResponse.json({error:'Staff directory unavailable'},{
      status:503,headers:{'Cache-Control':'no-store'}
    });
  }
}
