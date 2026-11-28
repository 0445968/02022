import {readReaderJson,ReaderWriteError} from '@/lib/permissions/reader-write-http';
import {NextResponse} from 'next/server';
import {validateStaffRoleChange} from '@/lib/permissions/staff-admin-input';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {applyStaffRoleChange} from '@/lib/services/staff-role-admin';

export const dynamic='force-dynamic';
export async function POST(request:Request){
  // Browser-only administrative mutation: reject cross-site or missing-origin
  // requests even when an attacker can cause cookies to be submitted.
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin){
    return NextResponse.json({error:'Origin rejected'},{status:403});
  }
  const contentType=request.headers.get('content-type')??'';
  if(!contentType.toLowerCase().startsWith('application/json')){
    return NextResponse.json({error:'JSON request required'},{status:415});
  }
  const length=Number(request.headers.get('content-length')??'0');
  if(!Number.isFinite(length)||length>2048){
    return NextResponse.json({error:'Request too large'},{status:413});
  }
  try{
    const access=await getStaffTeamAccess();
    if(!access.allowed||!access.canManageRoles||!access.mutationsEnabled){
      return NextResponse.json({error:'Not found'},{status:404});
    }
    let input:unknown;
    try{input=await readReaderJson(request,2048);}catch(error){
      return NextResponse.json({error:'Invalid request'},{status:error instanceof ReaderWriteError?error.status:400});
    }
    let valid;
    try{valid=validateStaffRoleChange(input);}catch{
      return NextResponse.json({error:'Invalid staff operation'},{status:422});
    }
    const result=await applyStaffRoleChange(valid);
    if(!result.ok){
      const code=result.code;
      const status=code==='invalid'?422:code==='rejected'?409:403;
      return NextResponse.json({error:'Staff change not permitted',code},{status});
    }
    return NextResponse.json({requestId:result.requestId,ok:true},{
      headers:{'Cache-Control':'no-store'}
    });
  }catch{
    return NextResponse.json({error:'Staff action unavailable'},{status:503});
  }
}
