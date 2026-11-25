import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {DRAFT_UUID} from './assigned-draft-contract';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export function constantEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function unsubscribeToken(id:string,generation:string,secret:string){return id+'.'+generation+'.'+createHmac('sha256',secret).update('unsubscribe:'+id+':'+generation).digest('base64url');}
export function verifyUnsubscribe(token:string,secret:string){
 const [id,generation,mac,...rest]=token.split('.');
 if(rest.length||!id||!generation||!mac||!DRAFT_UUID.test(id)||!DRAFT_UUID.test(generation)||!constantEqual(token,unsubscribeToken(id,generation,secret)))return null;
 return {id,generation};
}
export function verifyMailWebhook(raw:string,headers:{id:string;timestamp:string;signature:string},secret:string,now=Date.now()){
 if(!secret.startsWith('whsec_')||!headers.id||headers.id.length>200||!/^\d{1,12}$/.test(headers.timestamp)||Math.abs(now/1000-Number(headers.timestamp))>300)return false;
 const key=Buffer.from(secret.slice(6),'base64');if(key.length<16)return false;
 const mac=createHmac('sha256',key).update(headers.id+'.'+headers.timestamp+'.'+raw).digest('base64');
 return headers.signature.split(' ').some(v=>v.startsWith('v1,')&&constantEqual(v.slice(3),mac));
}
