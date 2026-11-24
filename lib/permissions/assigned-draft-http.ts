import {DRAFT_BODY_LIMIT} from './assigned-draft-contract';
export class DraftHttpError extends Error{constructor(public readonly status:number){super('Draft unavailable');}}
export async function readDraftRequest(request:Request):Promise<unknown>{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DraftHttpError(403);
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')throw new DraftHttpError(415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>DRAFT_BODY_LIMIT))throw new DraftHttpError(413);
  if(!request.body)throw new DraftHttpError(400);
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>DRAFT_BODY_LIMIT){await reader.cancel();throw new DraftHttpError(413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }catch(e){if(e instanceof DraftHttpError)throw e;throw new DraftHttpError(400);}finally{reader.releaseLock();}
}
