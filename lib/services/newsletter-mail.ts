import 'server-only';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {communicationsClient,communicationsEnabled,checked,readNewsletters} from './reader-communications';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {isTopic,type Topic} from '@/lib/permissions/reader-communications-contract';
import {hashToken,unsubscribeToken,verifyUnsubscribe,constantEqual,verifyMailWebhook} from '@/lib/permissions/newsletter-crypto';
type Delivery={id:string;subscriptionId:string;generation:string;email:string;locale:'en'|'es';topic:Topic;slug?:string;headline?:string};
function config(){
 const key=process.env.RESEND_API_KEY,from=process.env.CT_NEWSLETTER_FROM,secret=process.env.CT_NEWSLETTER_LINK_SECRET,origin=process.env.CT_NEWSLETTER_ORIGIN;
 if(!communicationsEnabled()||process.env.CT_NEWSLETTER_SEND_ENABLED!=='true'||!key||!from||!secret||secret.length<32||!origin)return null;
 try{const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)return null;}catch{return null;}
 return {key,from,secret,origin};
}
export function newsletterDeliveryConfigured(){return config()!==null;}
function service(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new DraftHttpError(503);
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function delivery(v:unknown):Delivery{
 const d=v as Delivery;if(!d||![d.id,d.subscriptionId,d.generation].every(x=>typeof x==='string'&&DRAFT_UUID.test(x))||typeof d.email!=='string'||!['en','es'].includes(d.locale)||!isTopic(d.topic))throw new DraftHttpError(503);
 return d;
}
const topicLabel=(topic:Topic,es:boolean)=>topic==='latest'?(es?'Últimas noticias':'Latest news'):topic==='san_andres'?'San Andrés':'Providencia';
async function send(d:Delivery,confirmation?:string){
 const cfg=config();if(!cfg)throw new DraftHttpError(503);
 const db=service(),es=d.locale==='es';
 const finish=async(state:'accepted'|'uncertain'|'cancelled',provider:string|null)=>{const {data,error}=await db.rpc('mail_finish_send',{p_id:d.id,p_state:state,p_provider:provider});if(checked(data,error)!==true)throw new DraftHttpError(503);};
 const {data:allowed,error:allowError}=await db.rpc('mail_send_allowed',{p_id:d.id});
 if(checked(allowed,allowError)!==true){await finish('cancelled',null);return false;}
 const topic=topicLabel(d.topic,es),base=cfg.origin+'/'+d.locale+'/newsletter-preference';
 const unsubscribe=base+'#unsubscribe='+encodeURIComponent(unsubscribeToken(d.subscriptionId,d.generation,cfg.secret));
 const link=confirmation?base+'#confirm='+encodeURIComponent(confirmation):cfg.origin+'/'+d.locale+'/article/'+encodeURIComponent(d.slug??'');
 const subject=confirmation?(es?'Confirme su suscripción: ':'Confirm your subscription: ')+topic:(es?'Noticias de Clear Talks: ':'Clear Talks news: ')+topic;
 if(!confirmation&&(!d.slug||!d.headline)){await finish('cancelled',null);return false;}
 const text=confirmation?(es?'Confirme su suscripción a ':'Confirm your subscription to ')+topic+'\n'+link+'\n\n'+(es?'Si no lo solicitó, ignore este mensaje.':'If you did not request this, ignore this message.'):
 (d.headline??'')+'\n'+link+'\n\n'+(es?'Cancelar suscripción: ':'Unsubscribe: ')+unsubscribe;
 // No automatic retry for ambiguous network results; the database claim is durable.
 try{
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+cfg.key,'Content-Type':'application/json','Idempotency-Key':'clear-talks/'+d.id},body:JSON.stringify({from:cfg.from,to:[d.email],subject,text,...(!confirmation?{headers:{'List-Unsubscribe':'<'+cfg.origin+'/api/newsletters/one-click?token='+encodeURIComponent(unsubscribeToken(d.subscriptionId,d.generation,cfg.secret))+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}:{})}),signal:AbortSignal.timeout(10000)});
  if(!res.ok){await finish('uncertain',null);return false;}
  const result=await res.json();if(typeof result.id!=='string'){await finish('uncertain',null);return false;}
  await finish('accepted',result.id);return true;
 }catch{try{await finish('uncertain',null);}catch{}return false;}
}
export async function requestNewsletter(topic:Topic){
 const cfg=config();if(!cfg)throw new DraftHttpError(503);
 const {user}=await communicationsClient();const token=randomBytes(32).toString('base64url');
 const {data,error}=await service().rpc('mail_begin_confirmation',{p_actor:user.id,p_topic:topic,p_hash:hashToken(token)});
 const d=delivery(checked(data,error));if(d.email.toLowerCase()!==user.email?.toLowerCase())throw new DraftHttpError(409);
 if(!(await send(d,token)))throw new DraftHttpError(503);
 return readNewsletters();
}
export async function handleNewsletterLink(action:'confirm'|'unsubscribe',token:string){
 if(!communicationsEnabled())throw new DraftHttpError(404);
 const db=service();
 if(action==='confirm'){
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return false;
  const {data,error}=await db.rpc('mail_confirm',{p_hash:hashToken(token)});return checked(data,error)===true;
 }
 const secret=process.env.CT_NEWSLETTER_LINK_SECRET;if(!secret||secret.length<32)return false;
 const parsed=verifyUnsubscribe(token,secret);if(!parsed)return false;
 const {data,error}=await db.rpc('mail_unsubscribe',{p_id:parsed.id,p_generation:parsed.generation});return checked(data,error)===true;
}
export async function sendDigestBatch(authorization:string|null){
 const secret=process.env.CT_NEWSLETTER_WORKER_SECRET;if(!config()||!secret||secret.length<32||!authorization||!constantEqual(authorization,'Bearer '+secret))throw new DraftHttpError(403);
 let claimed=0,accepted=0;
 // One claim per invocation to stay within serverless timeout and provider limits.
 const {data,error}=await service().rpc('mail_claim_digest');const value=checked(data,error);
 if(value!==null){claimed++;if(await send(delivery(value)))accepted++;}
 return {claimed,accepted};
}
export async function handleMailWebhook(raw:string,headers:{id:string;timestamp:string;signature:string}){
 const secret=process.env.RESEND_WEBHOOK_SECRET;if(!communicationsEnabled()||!secret||!verifyMailWebhook(raw,headers,secret))throw new DraftHttpError(403);
 let event;try{event=JSON.parse(raw);}catch{throw new DraftHttpError(400);}
 const kind=event?.type==='email.bounced'?'bounced':event?.type==='email.complained'?'complained':null;
 if(!kind)return;
 const provider=event?.data?.email_id;if(typeof provider!=='string'||provider.length>128)throw new DraftHttpError(400);
 const {data,error}=await service().rpc('mail_bounce',{p_event:headers.id,p_provider:provider,p_reason:kind});
 if(checked(data,error)!==true)throw new DraftHttpError(503);
}
