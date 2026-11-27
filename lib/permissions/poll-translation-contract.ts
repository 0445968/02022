export type PollTranslationAction='save'|'submit'|'withdraw'|'return'|'approve'|'publish';
export type PollTranslationCopy={question:string;options:string[]};
export type PollTranslationCommand={action:PollTranslationAction;expectedRevision:number;sourceFingerprint:string;copy:PollTranslationCopy|null;reason:string};
export type PollTranslationState={pollId:string;sourceLanguage:'en'|'es';targetLanguage:'en'|'es';sourceQuestion:string;sourceOptions:string[];sourceFingerprint:string;sourceStatus:string;revision:number;status:'draft'|'in_review'|'approved'|'published';question:string;options:string[];stale:boolean;published:boolean;publishedQuestion:string|null;publishedOptions:string[]|null;canEdit:boolean;canPublish:boolean;canApprove:boolean;history:{revision:number;action:PollTranslationAction;at:string;reason:string}[]};
const actions=['save','submit','withdraw','return','approve','publish'];
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid translation');return v as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const text=(v:unknown,min:number,max:number):v is string=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const labels=(v:unknown,empty=false):v is string[]=>Array.isArray(v)&&v.length>=2&&v.length<=8&&v.every(x=>text(x,empty?0:1,120))&&(empty||new Set(v.map(x=>x.trim().toLowerCase())).size===v.length);
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const rev=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<2147483647;
const lang=(v:unknown)=>v==='en'||v==='es';
export function parsePollTranslationCommand(raw:unknown):PollTranslationCommand{
 const x=obj(raw);if(!exact(x,['action','expectedRevision','sourceFingerprint','copy','reason'])||!actions.includes(String(x.action))||!rev(x.expectedRevision)||!hash(x.sourceFingerprint)||!text(x.reason,12,500))throw Error('Invalid command');
 if(x.action==='save'){const c=obj(x.copy);if(!exact(c,['question','options'])||!text(c.question,3,240)||!labels(c.options))throw Error('Invalid translated labels');}else if(x.copy!==null)throw Error('Unexpected copy');
 return x as unknown as PollTranslationCommand;
}
export function parsePollTranslationState(raw:unknown,id:string):PollTranslationState{
 const x=obj(raw);if(!exact(x,['pollId','sourceLanguage','targetLanguage','sourceQuestion','sourceOptions','sourceFingerprint','sourceStatus','revision','status','question','options','stale','published','publishedQuestion','publishedOptions','canEdit','canPublish','canApprove','history'])||x.pollId!==id||!lang(x.sourceLanguage)||!lang(x.targetLanguage)||x.sourceLanguage===x.targetLanguage||!text(x.sourceQuestion,3,240)||!labels(x.sourceOptions)||!hash(x.sourceFingerprint)||!rev(x.revision)||!['draft','in_review','approved','published','retired'].includes(String(x.sourceStatus))||!['draft','in_review','approved','published'].includes(String(x.status))||!text(x.question,x.revision===0?0:3,240)||!labels(x.options,x.revision===0)||x.options.length!==x.sourceOptions.length||!['stale','published','canEdit','canPublish','canApprove'].every(k=>typeof x[k]==='boolean')||(x.published?(!text(x.publishedQuestion,3,240)||!labels(x.publishedOptions)||x.publishedOptions.length!==x.sourceOptions.length):(x.publishedQuestion!==null||x.publishedOptions!==null))||!Array.isArray(x.history)||x.history.length>20)throw Error('Invalid translation state');
 for(const entry of x.history){const h=obj(entry);if(!exact(h,['revision','action','at','reason'])||!rev(h.revision)||!actions.includes(String(h.action))||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at))||!text(h.reason,12,500))throw Error('Invalid history');}
 return x as unknown as PollTranslationState;
}
