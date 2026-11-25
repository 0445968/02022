/**
 * Disposable, signed-out browser integration smoke against the built application.
 * This intentionally uses an empty public PostgREST fixture, NOT a database,
 * authenticated role fixture or Supabase emulator. No hosted credentials.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

assert.equal(process.env.CT15_LOCAL_SMOKE,'yes');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54329');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'ct15-local-anon-fixture');
assert.equal(process.env.DEV_AUTH_BYPASS,'false');
assert.equal(process.env.CT_STAFF_ACCESS_V2_ENABLED,'true');
assert.equal(process.env.CT_READER_ACCOUNT_ENABLED,'true');
assert.ok(!process.env.SUPABASE_SERVICE_ROLE_KEY);
const base='http://127.0.0.1:3015';
const width=Number(process.env.CT15_VIEWPORT_WIDTH);
assert.ok([390,768,1440].includes(width),'Run one explicit viewport shard');
const output=resolve('ct15-local-evidence');
await mkdir(output,{recursive:true});
const {chromium}=await import(pathToFileURL(resolve(process.env.CT15_PLAYWRIGHT_MODULE||'node_modules/playwright/index.mjs')).href);
const tables=new Set(['homepage_slots','breaking_news','stories','categories','story_categories','media_public_assets','editorial_profiles','story_tags','tags']);
const fixture={reads:{},deniedAuth:0,unexpected:[]};
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1:54329').pathname;
 const method=req.method||'';
 res.setHeader('Content-Type','application/json');
 if(method==='GET'&&path==='/auth/v1/user'){
  fixture.deniedAuth++;res.statusCode=401;res.end(JSON.stringify({code:'bad_jwt',message:'No authenticated fixture user'}));return;
 }
 const table=path.startsWith('/rest/v1/')?path.slice('/rest/v1/'.length):'';
 if(['GET','HEAD'].includes(method)&&tables.has(table)){
  fixture.reads[table]=(fixture.reads[table]||0)+1;
  res.setHeader('Content-Range','*/0');
  // PostgREST object media type has a no-row error; supabase maybeSingle
  // normally requests a JSON array on GET and converts [] to null.
  if(String(req.headers.accept).includes('vnd.pgrst.object')){
   res.statusCode=406;res.end(JSON.stringify({code:'PGRST116',details:'The result contains 0 rows',message:'Cannot coerce the result to a single JSON object',hint:null}));return;
  }
  res.end(method==='HEAD'?undefined:'[]');return;
 }
 fixture.unexpected.push({method,path});res.statusCode=403;res.end(JSON.stringify({code:'42501',message:'Not allowed in read-only fixture'}));
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(54329,'127.0.0.1',ok);});
let app,browser;
const rows=[],issues=[];
const check=(condition,message)=>{if(!condition){issues.push(message);console.error('FAIL '+message);}};
const checkpoint=async()=>writeFile(resolve(output,'results.json'),JSON.stringify({scope:'signed-out empty-data fixture, not restored Supabase or authenticated UAT',width,rows,fixture,issues},null,2));
const record=async row=>{rows.push(row);console.log('ROUTE '+JSON.stringify(row));await checkpoint();};
const http=(path,options={})=>fetch(base+path,{...options,signal:AbortSignal.timeout(10000)});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const run=(args)=>new Promise((ok,fail)=>{
 const child=spawn(process.execPath,args,{stdio:'inherit',env:process.env});
 child.on('error',fail);child.on('exit',(code,signal)=>code===0?ok():fail(Error('Process failed: '+code+' '+signal)));
});
try{
 // Build with exact fixture origin and flags, not an existing .next bundle.
 await run(['node_modules/next/dist/bin/next','build','--webpack']);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3015'],{stdio:'inherit',env:process.env});
 let ready=false;
 for(let i=0;i<100;i++){
  if(app.exitCode!==null)throw Error('Next server exited');
  try{const r=await fetch(base+'/en',{redirect:'manual',signal:AbortSignal.timeout(1500)});if(r.status===200){ready=true;break;}}catch{}
  await pause(500);
 }
 assert.ok(ready,'Local app failed to start');
 const localeRedirect=await http('/latest?fixture=1',{redirect:'manual',headers:{'Accept-Language':'es-CO'}});
 check([301,302,303,307,308].includes(localeRedirect.status),'Unprefixed locale redirect missing');
 const redirect=new URL(localeRedirect.headers.get('location')||'/',base);
 check(redirect.origin===base&&redirect.pathname==='/es/latest'&&redirect.search==='?fixture=1','Locale redirect changed origin, language or query');
 for(const [path,status] of [['/api/newsroom/team',404],['/api/account/profile',403]]){
  const r=await http(path,{redirect:'manual'});
  await record({path,status:r.status,expected:status});
  check(r.status===status,path+' expected '+status+' got '+r.status);
 }
 browser=await chromium.launch({headless:true});
 const publicPaths=['','/latest','/san-andres','/old-providence','/saint-catalina','/search','/auth/sign-in','/auth/sign-up','/auth/forgot-password','/newsletter-preference'];
 const privatePaths=['/account','/account/profile','/account/security','/account/saved','/account/comments','/account/reports','/account/notifications','/account/newsletters','/account/subscription','/newsroom','/newsroom/stories','/newsroom/team','/newsroom/media','/newsroom/reviews','/newsroom/schedule','/newsroom/polls','/newsroom/privacy','/newsroom/contributor','/newsroom/page-editor'];
 {
  const context=await browser.newContext({viewport:{width,height:900},locale:'en-US',serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   const headers=req.headers();
   // Abort speculative prefetches, not actual navigations or user actions.
   if(headers['next-router-prefetch']==='1'||headers.purpose==='prefetch'||headers['sec-purpose']==='prefetch')return route.abort();
   return url.origin===base&&['GET','HEAD'].includes(req.method())?route.continue():route.abort();
  });
  for(const locale of ['en','es'])for(const path of publicPaths){
   const target='/'+locale+path,errors=[],badResponses=[];
   console.log('BEGIN '+width+' '+target);
   const page=await context.newPage();page.setDefaultTimeout(10000);
   const error=e=>errors.push(e.name+': '+e.message.slice(0,300));
   const response=r=>{if(r.status()>=500&&new URL(r.url()).origin===base)badResponses.push(new URL(r.url()).pathname);};
   page.on('pageerror',error);page.on('response',response);
   try{
    // Verify server HTML with a forged locale header and bound raw reads.
    const raw=await http(target,{headers:{'x-sr-locale':locale==='es'?'en':'es'},redirect:'manual'});
    const html=await raw.text();
    const htmlTag=html.match(/<html[^>]*>/i)?.[0]||'';
    check(raw.status===200&&htmlTag.includes('lang="'+locale+'"'),target+' server document language mismatch');
    const r=await page.goto(base+target,{waitUntil:'domcontentloaded',timeout:12000});
    await page.locator('main').first().waitFor({state:'visible',timeout:10000});
    await page.waitForFunction(()=>document.fonts.status==='loaded',undefined,{timeout:8000});
    // Capture post-hydration errors without relying on global network idle.
    await page.waitForTimeout(350);
    const metrics=await page.evaluate(()=>({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),main:document.querySelectorAll('main').length,headings:document.querySelectorAll('h1').length,lang:document.documentElement.lang,visibleText:document.body.innerText.length}));
    const final=new URL(page.url());
    check(r?.status()===200&&final.origin===base&&final.pathname===target,target+' failed navigation at '+width);
    check(metrics.visibleText>40&&metrics.main===1,target+' missing meaningful shell at '+width);
    check(metrics.lang===locale,target+' document language mismatch at '+width);
    check(metrics.overflow<=1,target+' horizontal overflow '+metrics.overflow+' at '+width);
    check(!errors.length&&!badResponses.length,target+' runtime/HTTP error at '+width);
    await record({path:target,width,status:r?.status(),finalPath:final.pathname,...metrics,errors,badResponses});
    if(['','/latest','/auth/sign-in','/newsletter-preference'].includes(path))await page.screenshot({path:resolve(output,width+'-'+locale+(path||'/home').replaceAll('/','-')+'.png'),fullPage:true,timeout:8000,animations:'disabled'});
   }catch(e){check(false,target+' browser failure at '+width+': '+String(e).slice(0,300));await record({path:target,width,error:String(e).slice(0,300)});}
   finally{page.off('pageerror',error);page.off('response',response);await page.close();await checkpoint();}
  }
  // Repeat authenticated-area denial at mobile and desktop, never supply
  // cookies or credentials and never follow off-origin navigation.
  if(width!==768)for(const path of privatePaths){
   console.log('BEGIN '+width+' '+path);
   const page=await context.newPage();page.setDefaultTimeout(10000);
   try{
    const r=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:12000});
    await page.waitForURL(url=>url.origin===base&&/^\/(en|es)\/auth\/sign-in$/.test(url.pathname),{timeout:10000});
    const final=new URL(page.url());
    check(final.origin===base&&/^\/(en|es)\/auth\/sign-in$/.test(final.pathname),path+' not denied at '+width);
    check(await page.locator('input[type="password"]').count()>0,path+' missing real sign-in form');
    await record({path,width,status:r?.status(),finalPath:final.pathname,denied:true});
   }catch(e){check(false,path+' denial failure at '+width+': '+String(e).slice(0,300));await record({path,width,error:String(e).slice(0,300)});}
   finally{await page.close();await checkpoint();}
  }
  await context.close();
 }
 check(fixture.unexpected.length===0,'Unexpected or mutating fixture calls: '+JSON.stringify(fixture.unexpected));
 for(const table of ['stories','homepage_slots','breaking_news','categories'])check((fixture.reads[table]||0)>0,'Fixture was never queried for '+table);
}finally{
 if(browser)await browser.close();
 if(app&&app.exitCode===null)app.kill('SIGTERM');
 server.closeAllConnections();await new Promise(ok=>server.close(ok));
 await checkpoint();
}
console.log(JSON.stringify({checks:rows.length,issues,fixture}));
assert.equal(issues.length,0,'Inspect disposable local evidence; no live validation implied');
