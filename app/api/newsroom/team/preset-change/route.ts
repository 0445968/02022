import {readReaderJson,ReaderWriteError} from '@/lib/permissions/reader-write-http';
import {NextResponse} from 'next/server';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {validatePresetGrantChange} from '@/lib/permissions/staff-preset-input';
import {applyStaffPresetGrantChange} from '@/lib/services/staff-preset-admin';

export const dynamic='force-dynamic';
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin){
    return NextResponse.json({error:'Origin rejected'},{status:403});
  }
  if(!(request.headers.get('content-type')??'')
    .toLowerCase().startsWith('application/json')){
    return NextResponse.json({error:'JSON required'},{status:415});
  }
  const length=Number(request.headers.get('content-length')??'0');
  if(!Number.isFinite(length)||length>8192){
    return NextResponse.json({error:'Request too large'},{status:413});
  }
  try{
    const access=await getStaffTeamAccess();
    if(!access.allowed||!access.canManageRoles||!access.mutationsEnabled
      ||process.env.CT_STAFF_PRESET_MUTATIONS_ENABLED!=='true'){
      return NextResponse.json({error:'Not found'},{status:404});
    }
    let raw:unknown;
    try{raw=await readReaderJson(request,8192);}
    catch(error){
      return NextResponse.json({error:'Invalid request'},{status:error instanceof ReaderWriteError?error.status:400});}
    let input;
    try{input=validatePresetGrantChange(raw);}
    catch{return NextResponse.json({error:'Invalid role capability matrix'},{status:422});}
    const result=await applyStaffPresetGrantChange(input);
    if(!result.ok){
      return NextResponse.json({
        error:result.code==='conflict'
          ?'Preset was changed by another administrator. Reload before saving.'
          :'Preset edit denied',code:result.code
      },{status:result.code==='conflict'?409:result.code==='invalid'?422:403,
        headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json({
      ok:true,requestId:result.requestId,revision:result.revision
    },{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Role preset service unavailable'},
      {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
