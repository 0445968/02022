import {DRAFT_UUID} from './assigned-draft-contract';
export type WriterDraftInput={requestId:string;headline:string;language:'en'|'es'};
export function validateWriterDraft(raw:unknown):WriterDraftInput{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid draft');
 const r=raw as Record<string,unknown>;
 if(Object.keys(r).length!==3||!['requestId','headline','language'].every(k=>Object.prototype.hasOwnProperty.call(r,k))||
 typeof r.requestId!=='string'||!DRAFT_UUID.test(r.requestId)||typeof r.headline!=='string'||!r.headline.trim()||
 r.headline.length>300||/[\u0000-\u001f\u007f]/.test(r.headline)||(r.language!=='en'&&r.language!=='es'))throw Error('Invalid draft');
 return {requestId:r.requestId,headline:r.headline.trim(),language:r.language};
}
