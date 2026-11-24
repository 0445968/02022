/** CT-04a.3 invitation HTTP contract. Server only: imports Node crypto. */
import {validateInviteIssue,hashInviteToken,type InviteIssue} from './staff-invitation-contract';

export const INVITE_BODY_LIMIT=4096;
export const INVITE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type InviteCommand =
  | {action:'issue'|'replace';input:InviteIssue;replaceId:string|null}
  | {action:'cancel';id:string;reason:string}
  | {action:'redeem';tokenHash:string};
function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid request');
  return value as Record<string,unknown>;
}
function exact(obj:Record<string,unknown>,keys:string[]){
  if(Object.keys(obj).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(obj,k)))
    throw Error('Invalid fields');
}
export function validateInviteCommand(raw:unknown,now=Date.now()):InviteCommand{
  const obj=record(raw);
  if(obj.action==='issue'||obj.action==='replace'){
    exact(obj,obj.action==='issue'?['action','input']:['action','input','replaceId']);
    if(obj.action==='replace'&&(typeof obj.replaceId!=='string'||!INVITE_UUID.test(obj.replaceId)))
      throw Error('Invalid replacement');
    return {action:obj.action,input:validateInviteIssue(obj.input,now),
      replaceId:obj.action==='replace'?obj.replaceId as string:null};
  }
  if(obj.action==='cancel'){
    exact(obj,['action','id','reason','confirmed']);
    if(typeof obj.id!=='string'||!INVITE_UUID.test(obj.id)||obj.confirmed!==true||
      typeof obj.reason!=='string'||obj.reason.trim().length<12||obj.reason.length>500)
      throw Error('Invalid cancellation');
    return {action:'cancel',id:obj.id,reason:obj.reason.trim()};
  }
  if(obj.action==='redeem'){
    exact(obj,['action','token']);
    return {action:'redeem',tokenHash:hashInviteToken(obj.token)};
  }
  throw Error('Invalid action');
}
export class InviteRequestError extends Error {
  constructor(public readonly status:number){super('Invalid invitation request');}
}
/** Reject chunked/undeclared bodies beyond limit as well as declared oversized requests. */
export async function readInviteRequest(request:Request):Promise<unknown>{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw new InviteRequestError(403);
  const type=(request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  if(type!=='application/json')throw new InviteRequestError(415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>INVITE_BODY_LIMIT))
    throw new InviteRequestError(413);
  if(!request.body)throw new InviteRequestError(400);
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>INVITE_BODY_LIMIT){await reader.cancel();throw new InviteRequestError(413);}
      chunks.push(value);
    }
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }catch(e){if(e instanceof InviteRequestError)throw e;throw new InviteRequestError(400);}
  finally{reader.releaseLock();}
}
