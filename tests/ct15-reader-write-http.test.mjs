import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readReaderJson,requireReaderOrigin,READER_JSON_LIMIT} from '../lib/permissions/reader-write-http.ts';
const origin='https://example.test',url=origin+'/api/stories/test/comments';
const req=(body,headers={})=>new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body,...(body instanceof ReadableStream?{duplex:'half'}:{})});
const rejects=(r,status)=>assert.rejects(readReaderJson(r),e=>e.status===status);
test('reader writes reject absent, null and foreign origins regardless of forwarded headers',async()=>{
 for(const value of ['null','https://untrusted.test','https://example.test:444']){
  await rejects(req('{}',{Origin:value,'X-Forwarded-Host':'example.test'}),403);
 }
 assert.throws(()=>requireReaderOrigin(new Request(url,{method:'DELETE'})),e=>e.status===403);
 assert.doesNotThrow(()=>requireReaderOrigin(req('{}')));
});
test('reader JSON checks media type, object shape and actual UTF-8',async()=>{
 assert.deepEqual(await readReaderJson(req('{"body":"hello"}',{'Content-Type':'application/json; charset=utf-8'})),{body:'hello'});
 await rejects(req('{}',{'Content-Type':'text/plain'}),415);
 for(const body of ['null','[]','true','"text"','{'])await rejects(req(body),400);
 await rejects(req(new Uint8Array([0xff])),400);
});
test('reader JSON limits declared and streamed body bytes',async()=>{
 await rejects(req('{}',{'Content-Length':String(READER_JSON_LIMIT+1)}),413);
 await rejects(req('{}',{'Content-Length':'bad'}),413);
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(READER_JSON_LIMIT));controller.enqueue(new Uint8Array(1));controller.close();}});
 await rejects(req(stream,{'Content-Length':'2'}),413);
});
test('all five legacy reader write handlers apply the guard',()=>{
 const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const bookmarks=f('app/api/bookmarks/stories/[storyId]/route.ts');
 assert.equal((bookmarks.match(/requireReaderOrigin\(request\)/g)||[]).length,2);
 const comments=f('app/api/stories/[id]/comments/route.ts');
 assert.match(comments,/await readReaderJson\(request\)/);
 const account=f('app/api/account/comments/[commentId]/route.ts');
 assert.match(account,/await readReaderJson\(request\)/);
 assert.match(account,/requireReaderOrigin\(request\)/);
});


test('staff and media writes share a streamed request guard with route-specific limits',async()=>{
 await assert.rejects(readReaderJson(req('{"body":"'+ 'x'.repeat(2048)+'"}'),2048),e=>e.status===413);
 const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 for(const [route,limit] of [['role-change',2048],['override-change',2048],['preset-change',8192]]){
  assert.ok(f('app/api/newsroom/team/'+route+'/route.ts').includes('await readReaderJson(request,'+limit+')'));
 }
 for(const route of ['approve','reject'])assert.match(f('app/api/media/drafts/[id]/'+route+'/route.ts'),/await readReaderJson\(request\)/);
});
