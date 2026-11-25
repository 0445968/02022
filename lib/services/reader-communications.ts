import 'server-only';
import {readerAccountEnabled,readerClient} from '@/lib/services/reader-account';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {parseNoticePage,parseNewsletterState,type NoticeCommand,type Topic} from '@/lib/permissions/reader-communications-contract';
export function communicationsEnabled(){return readerAccountEnabled()&&process.env.CT_READER_COMMUNICATIONS_ENABLED==='true'&&process.env.CT_STAFF_ACCESS_V2_ENABLED==='true';}
export async function communicationsClient(){if(!communicationsEnabled())throw new DraftHttpError(404);return readerClient();}
export function checked<T>(data:T,error:{code?:string}|null):T{if(error)throw new DraftHttpError(error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'?422:503);return data;}
export async function readNotices(page:number){if(!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);const {db}=await communicationsClient();const {data,error}=await db.rpc('reader_read_notices',{p_page:page});return parseNoticePage(checked(data,error));}
export async function changeNotices(c:NoticeCommand){
 const {db}=await communicationsClient(),p=c.action==='preferences'?c:null;
 const {data,error}=await db.rpc('reader_change_notices',{p_action:c.action,p_expected:p?.expectedRevision??null,p_stories:p?.stories??null,p_replies:p?.replies??null,p_privacy:p?.privacy??null,p_event:'id' in c?c.id:null,p_page:c.page});
 return parseNoticePage(checked(data,error));
}
export async function readNewsletters(){const {db}=await communicationsClient();const {data,error}=await db.rpc('reader_read_newsletters');return parseNewsletterState(checked(data,error));}
export async function unsubscribeTopic(topic:Topic){const {db}=await communicationsClient();const {data,error}=await db.rpc('reader_unsubscribe_topic',{p_topic:topic});return parseNewsletterState(checked(data,error));}
