import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const mockSdk=url('export function createServerClient(url,key,options){return options.cookies}');
const mockNext=url(`function jar(initial=[]){const m=new Map(initial.map(x=>[x.name,x]));return {getAll:()=>Array.from(m.values()),set:(a,b,c)=>{const v=typeof a==='string'?{name:a,value:b,...c}:a;m.set(v.name,v);}}}
export const makeRequest=()=>({cookies:jar([{name:'sb-session.8',value:'old'}])});
export const NextResponse={next:({request})=>({cookies:jar(),forwarded:request.cookies.getAll().map(x=>({...x}))})};
`);
const {makeRequest}=await import(mockNext);
const {createMiddlewareClient}=await import(url(compile(f('lib/db/supabase-middleware.ts')).replace("'@supabase/ssr'","'"+mockSdk+"'").replace("'next/server'","'"+mockNext+"'")));
test('middleware reads all cookie chunks and forwards fresh cookies, preserving earlier response mutations',()=>{
 const req=makeRequest(),{client,getResponse}=createMiddlewareClient(req),old=getResponse();
 assert.equal(client.getAll()[0].name,'sb-session.8');
 client.setAll([{name:'sb-session.0',value:'new',options:{httpOnly:true}},{name:'sb-session.8',value:'',options:{maxAge:0}}]);
 client.setAll([{name:'sb-session.1',value:'next',options:{secure:true}}]);
 const res=getResponse();assert.notEqual(res,old);
 assert.equal(res.forwarded.find(x=>x.name==='sb-session.0').value,'new');
 assert.equal(res.cookies.getAll().find(x=>x.name==='sb-session.8').maxAge,0);
 assert.equal(res.cookies.getAll().find(x=>x.name==='sb-session.0').httpOnly,true);
 assert.equal(res.cookies.getAll().find(x=>x.name==='sb-session.1').secure,true);
 const mw=f('middleware.ts');assert.ok(mw.indexOf('await client.auth.getUser()')<mw.indexOf('const response = getResponse()'));
 assert.match(mw,/response\.cookies\.getAll\(\)\.forEach/);
});
test('server adapter supports both synchronous and asynchronous request cookie stores',async()=>{
 const mockHeaders=url(`export let store;export function setStore(s){store=s}export function cookies(){return store}`);
 const {setStore}=await import(mockHeaders);
 const {createClient}=await import(url(compile(f('lib/db/supabase-server.ts')).replace("'@supabase/ssr'","'"+mockSdk+"'").replace("'next/headers'","'"+mockHeaders+"'")));
 for(const asyncStore of [false,true]){
  const records=[],store={getAll:()=>[{name:'session',value:'x'}],set:(...args)=>records.push(args)};
  setStore(asyncStore?Promise.resolve(store):store);
  const client=createClient();assert.deepEqual(await client.getAll(),[{name:'session',value:'x'}]);
  await client.setAll([{name:'session',value:'y',options:{httpOnly:true}}]);assert.deepEqual(records,[['session','y',{httpOnly:true}]]);
 }
});
