export type TranslationLanguage='en'|'es';
export type TranslationUnlinked={linked:false;sourceId:string;sourceLanguage:TranslationLanguage;sourceFingerprint:string;canCreate:boolean;retired?:true};
export type TranslationLinked={linked:true;sourceId:string;sourceLanguage:TranslationLanguage;sourceHeadline:string;sourceFingerprint:string;targetId:string;targetLanguage:TranslationLanguage;targetHeadline:string;targetStatus:string;revision:number;draftStale:boolean;publishedStale:boolean;canRefresh:boolean;targetUpdatedAt:string|null};
export type TranslationState=TranslationUnlinked|TranslationLinked;
export type TranslationCommand={action:'create';sourceId:string;sourceFingerprint:string;headline:string;requestId:string;reason:string}|{action:'refresh';sourceId:string;sourceFingerprint:string;revision:number;targetUpdatedAt:string;requestId:string;reason:string};
export type PublicTranslationPair={storyId:string;sourceId:string;counterpart:{id:string;slug:string;language:TranslationLanguage}|null};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const lang=(v:unknown):v is TranslationLanguage=>v==='en'||v==='es';
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<2147483647;
const timestamp=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid translation');return v as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const reason=(v:unknown)=>typeof v==='string'&&v.trim().length>=12&&v.length<=500&&!/[\u0000-\u001f\u007f]/.test(v);
export function parseTranslationCommand(raw:unknown):TranslationCommand{
 const c=obj(raw);if(!uuid(c.sourceId)||!hash(c.sourceFingerprint)||!uuid(c.requestId)||!reason(c.reason))throw Error('Invalid translation command');
 const base=['action','sourceId','sourceFingerprint','requestId','reason'];
 if(c.action==='create'){if(!exact(c,[...base,'headline'])||typeof c.headline!=='string'||!c.headline.trim()||c.headline.length>300||/[\u0000-\u001f\u007f]/.test(c.headline))throw Error('Invalid manual headline');}
 else if(c.action==='refresh'){if(!exact(c,[...base,'revision','targetUpdatedAt'])||!rev(c.revision)||!timestamp(c.targetUpdatedAt))throw Error('Invalid translation refresh');}
 else throw Error('Invalid action');
 return c as unknown as TranslationCommand;
}
export function parseTranslationState(raw:unknown,id:string):TranslationState{
 const c=obj(raw),base=['linked','sourceId','sourceLanguage','sourceFingerprint'];
 if(!uuid(c.sourceId)||!lang(c.sourceLanguage)||!hash(c.sourceFingerprint))throw Error('Invalid source');
 if(c.linked===false){if(!(exact(c,[...base,'canCreate'])||(exact(c,[...base,'canCreate','retired'])&&c.retired===true&&c.canCreate===false))||c.sourceId!==id||typeof c.canCreate!=='boolean')throw Error('Invalid unlinked source');}
 else if(c.linked===true){if(!exact(c,[...base,'sourceHeadline','targetId','targetLanguage','targetHeadline','targetStatus','revision','draftStale','publishedStale','canRefresh','targetUpdatedAt'])||!uuid(c.targetId)||c.targetId===c.sourceId||(id!==c.sourceId&&id!==c.targetId)||!lang(c.targetLanguage)||c.targetLanguage===c.sourceLanguage||typeof c.sourceHeadline!=='string'||typeof c.targetHeadline!=='string'||typeof c.targetStatus!=='string'||!rev(c.revision)||typeof c.draftStale!=='boolean'||typeof c.publishedStale!=='boolean'||typeof c.canRefresh!=='boolean'||(c.targetUpdatedAt!==null&&!timestamp(c.targetUpdatedAt)))throw Error('Invalid linked translation');}
 else throw Error('Invalid linked state');return c as unknown as TranslationState;
}
export function parsePublicTranslationPairs(raw:unknown,ids:readonly string[]):PublicTranslationPair[]{
 if(!Array.isArray(raw)||raw.length>ids.length||raw.length>100)throw Error('Invalid public translations');const seen=new Set<string>();
 for(const item of raw){const x=obj(item);if(!exact(x,['storyId','sourceId','counterpart'])||!uuid(x.storyId)||!uuid(x.sourceId)||!ids.includes(x.storyId)||seen.has(x.storyId))throw Error('Invalid translation pair');seen.add(x.storyId);if(x.counterpart!==null){const y=obj(x.counterpart);if(!exact(y,['id','slug','language'])||!uuid(y.id)||y.id===x.storyId||!lang(y.language)||typeof y.slug!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,299}$/.test(y.slug))throw Error('Invalid counterpart');}}
 return raw as PublicTranslationPair[];
}
