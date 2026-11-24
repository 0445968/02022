import {NextResponse} from 'next/server';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {validateOverrideChange} from '@/lib/permissions/staff-override-input';
import {applyStaffOverrideChange} from '@/lib/services/staff-override-admin';

export const dynamic='force-dynamic';
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin){
    return NextResponse.json({error:'Origin rejected'},{status:403});
  }
  if(!(request.headers.get('content-type')??'').toLowerCase().startsWith('application/json')){
    return NextResponse.json({error:'JSON required'},{status:415});
  }
  const size=Number(request.headers.get('content-length')??'0');
  if(!Number.isFinite(size)||size>2048){
    return NextResponse.json({error:'Oversized request'},{status:413});
  }
  const access=await getStaffTeamAccess();
  if(!access.allowed||!access.canManageOverrides||!access.overrideMutationsEnabled){
    return NextResponse.json({error:'Not found'},{status:404});
  }
  let raw:unknown;
  try{raw=await request.json();}catch{
    return NextResponse.json({error:'Invalid JSON'},{status:400});
  }
  let validated;
  try{validated=validateOverrideChange(raw);}catch{
    return NextResponse.json({error:'Invalid override'},{status:422});
  }
  const result=await applyStaffOverrideChange(validated);
  if(!result.ok){
    return NextResponse.json({error:'Override not permitted',code:result.code},{
      status:result.code==='invalid'?422:result.code==='rejected'?409:403
    });
  }
  return NextResponse.json({ok:true,requestId:result.requestId},{
    headers:{'Cache-Control':'no-store'}
  });
}
