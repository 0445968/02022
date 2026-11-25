/** Reader writes use cookie authentication plus an explicit same-origin boundary.
 * Do not accept forwarded headers as authority. Bound actual streamed bytes,
 * not only Content-Length, and reject invalid UTF-8/non-object JSON. */
export const READER_JSON_LIMIT=20_000;
export class ReaderWriteError extends Error {
  readonly status:number;
  constructor(status:number){super('Invalid reader request');this.status=status;}
}
export function requireReaderOrigin(request:Request):void{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new ReaderWriteError(403);
}
export async function readReaderJson(request:Request,limit=READER_JSON_LIMIT):Promise<Record<string,unknown>>{
  requireReaderOrigin(request);
  if((request.headers.get('content-type')??'').split(';')[0].trim().toLowerCase()!=='application/json')throw new ReaderWriteError(415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))throw new ReaderWriteError(413);
  if(!request.body)throw new ReaderWriteError(400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];
  let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>limit){await reader.cancel().catch(()=>{});throw new ReaderWriteError(413);}
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new ReaderWriteError(400);
    return value as Record<string,unknown>;
  }catch(error){if(error instanceof ReaderWriteError)throw error;throw new ReaderWriteError(400);}
  finally{reader.releaseLock();}
}
