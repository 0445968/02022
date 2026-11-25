/** Read-only, signed-out browser audit of a user-approved isolated preview.
 * No cookies, credentials, writes, production default or external navigation.
 * Install pinned Playwright separately; CT15 GitHub workflow supplies module path.
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const input=process.env.CT15_PREVIEW_ORIGIN;
assert.ok(input&&process.env.CT15_APPROVED_READ_ONLY==='yes','Explicit isolated Preview approval required');
const base=new URL(input);
assert.ok(base.protocol==='https:'&&base.origin===input&&!base.username&&!base.password,'Exact HTTPS origin required');
assert.notEqual(base.hostname,'clear-talks.vercel.app','Production is not an allowed preview target');
assert.ok(base.hostname.endsWith('.vercel.app'),'Use the approved Vercel preview hostname');
const {chromium}=await import(pathToFileURL(resolve(process.env.CT15_PLAYWRIGHT_MODULE||'node_modules/playwright/index.mjs')).href);
const out=resolve('ct15-browser-evidence');await mkdir(out,{recursive:true});
const result=[];const browser=await chromium.launch({headless:true});
try{
 for(const size of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  const ctx=await browser.newContext({viewport:size,locale:'en-US',serviceWorkers:'block'});
  // Prevent application requests that would mutate data or contact third-party origins.
  await ctx.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==base.origin||!['GET','HEAD'].includes(req.method()))return route.abort();return route.continue();});
  const page=await ctx.newPage();
  for(const route of ['/en','/es','/en/latest','/es/latest','/en/auth/sign-in','/es/auth/sign-in','/en/auth/sign-up','/es/auth/sign-up']){
   const errors=[];const handler=e=>errors.push(e.name||'Error');page.on('pageerror',handler);
   const res=await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded',timeout:30000});
   await page.evaluate(()=>document.fonts.ready).catch(()=>undefined);
   const metrics=await page.evaluate(()=>({lang:document.documentElement.lang,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),main:document.querySelectorAll('main').length,headings:document.querySelectorAll('h1').length}));
   const key=size.width+'-'+route.replaceAll('/','-').slice(1);
   await page.screenshot({path:resolve(out,key+'.png'),fullPage:true});
   result.push({route,width:size.width,status:res?.status(),finalPath:new URL(page.url()).pathname,...metrics,errors});
   page.off('pageerror',handler);
  }
  for(const route of ['/account','/account/profile','/account/security','/account/notifications','/account/newsletters','/account/subscription','/newsroom','/newsroom/team','/newsroom/stories','/newsroom/privacy']){
   const res=await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded',timeout:30000});const finalPath=new URL(page.url()).pathname;
   result.push({route,width:size.width,status:res?.status(),finalPath,denied:finalPath.endsWith('/auth/sign-in')||finalPath==='/newsroom/denied'});
  }
  await ctx.close();
 }
}finally{await browser.close();await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));}
const failed=result.filter(r=>r.status!==200||('denied' in r?!r.denied:r.overflow>1||r.errors.length>0||!r.finalPath.startsWith(r.route.slice(0,3))));
console.log(JSON.stringify({checks:result.length,failures:failed.length,notes:'Third-party network blocked: screenshots are layout evidence only, not image/provider acceptance.'}));
assert.equal(failed.length,0,'Inspect browser evidence for route, overflow or runtime failures');
