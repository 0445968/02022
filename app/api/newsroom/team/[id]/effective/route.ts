import {NextResponse} from 'next/server';
import {loadEffectiveMemberPermissions} from '@/lib/services/staff-effective-access';

export const dynamic='force-dynamic';
export async function GET(_request:Request, props:{params: Promise<{id:string}>}) {
  const params = await props.params;
  try{
    const result=await loadEffectiveMemberPermissions(params.id);
    return NextResponse.json(result,{headers:{
      'Cache-Control':'private, no-store, max-age=0'
    }});
  }catch{
    // Never reveal whether an unauthorized membership ID exists.
    return NextResponse.json({error:'Permission preview unavailable'},{
      status:404,headers:{'Cache-Control':'no-store'}
    });
  }
}
