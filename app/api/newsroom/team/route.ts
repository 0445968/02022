import {NextResponse} from 'next/server';
import {getStaffTeamAccess,readStaffTeamDirectory} from '@/lib/services/staff-team-directory';

export const dynamic='force-dynamic';
export async function GET(){
  try{
    const access=await getStaffTeamAccess();
    if(!access.allowed){
      return NextResponse.json({error:'Not found'},{status:404});
    }
    const directory=await readStaffTeamDirectory(access);
    return NextResponse.json(directory,{headers:{'Cache-Control':'private, no-store, max-age=0'}});
  }catch{
    return NextResponse.json({error:'Staff directory unavailable'},{
      status:503,headers:{'Cache-Control':'no-store'}
    });
  }
}
