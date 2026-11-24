/** CI hard stop: never point a disposable write probe at Clear Talks live. */
export const PRODUCTION_SUPABASE_REF='yqqzohrlhiitctwacdad';
export function assertDisposableTarget(url,ref,ack){
  if(typeof ref!=='string'||!/^[a-z0-9]{20}$/.test(ref))
    throw new Error('Explicit disposable 20-character project ref required');
  if(ref===PRODUCTION_SUPABASE_REF)
    throw new Error('Clear Talks production is prohibited');
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port
    ||parsed.hostname!==ref+'.supabase.co'||parsed.pathname!=='/'
    ||parsed.search||parsed.hash)
    throw new Error('URL must exactly match the disposable Supabase project ref');
  if(ack!=='YES_DISPOSABLE_WRITES')
    throw new Error('Disposable write acknowledgment required');
  return parsed.href;
}
