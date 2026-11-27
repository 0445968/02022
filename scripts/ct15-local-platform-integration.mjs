/**
 * Real local Supabase Auth + PostgREST + Storage + built Next app.
 * CI-only synthetic identities; never link or use hosted Supabase.
 */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {PROPOSED_STAFF_ROLE_GRANTS} from '../lib/permissions/role-presets.ts';

assert.equal(process.env.CI,'true');
assert.equal(process.env.CT15_REAL_LOCAL_PLATFORM,'yes');
assert.equal(process.env.DEV_AUTH_BYPASS,'false');
assert.ok(!process.env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_SERVICE_ROLE_KEY&&!process.env.NEXT_PUBLIC_SUPABASE_URL);
const output=resolve('ct15-platform-evidence');
mkdirSync(output,{recursive:true});
const report={scope:'real local Supabase services; synthetic legacy schema and accounts, NOT a hosted restore',stages:[],checks:[],roleErrors:[],success:false};
const checkpoint=()=>writeFileSync(resolve(output,'results.json'),JSON.stringify(report,null,2));
const mark=(stage)=>{report.stages.push(stage);console.log('STAGE '+stage);checkpoint();};
const check=(name,ok)=>{report.checks.push({name,ok:!!ok});console.log((ok?'PASS ':'FAIL ')+name);checkpoint();assert.ok(ok,name);};
const values=Object.fromEntries(readFileSync(process.env.CT15_LOCAL_STATUS_FILE,'utf8').split(/\r?\n/).flatMap(line=>{
 const m=line.match(/^([A-Z_]+)=(?:"([^"]*)"|([^\s]+))$/);
 return m?[[m[1],m[2]??m[3]]]:[];
}));
const api=new URL(values.API_URL),db=new URL(values.DB_URL);
assert.ok(api.protocol==='http:'&&['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321'&&api.pathname==='/');
assert.ok(['postgresql:','postgres:'].includes(db.protocol)&&['127.0.0.1','localhost'].includes(db.hostname)&&db.port==='54322'&&db.pathname==='/postgres'&&db.username==='postgres'&&!db.search&&!db.hash);
assert.ok(values.ANON_KEY&&values.SERVICE_ROLE_KEY&&values.ANON_KEY!==values.SERVICE_ROLE_KEY);
const dbEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')&&!/DATABASE_URL|SUPABASE_/.test(key)));
dbEnv.PGPASSWORD=decodeURIComponent(db.password);dbEnv.PGCONNECT_TIMEOUT='5';
// NextURL normalizes loopback hostnames to localhost. Use the same canonical
// hostname for real browser navigation and Origin, not a forged Origin alias.
const apiOrigin=api.origin,appOrigin='http://localhost:3016';
const creds=[values.ANON_KEY,values.SERVICE_ROLE_KEY,values.JWT_SECRET,dbEnv.PGPASSWORD].filter(Boolean);
const redact=x=>creds.reduce((v,k)=>v.split(k).join('[redacted]'),String(x)).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[redacted jwt]');
function sql(label,args,input){
 const p=spawnSync('psql',['-X','-w','-h',db.hostname,'-p','54322','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1',...args],{env:dbEnv,encoding:'utf8',input,timeout:90000,maxBuffer:8*1024*1024});
 writeFileSync(resolve(output,'sql-'+String(report.stages.length).padStart(3,'0')+'.log'),redact((p.stdout??'')+(p.stderr??'')));
 assert.equal(p.status,0,label+' failed; inspect redacted SQL stage log');
 return p.stdout.trim();
}
const apply=path=>{mark(path);sql(path,['-f',path]);};
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const uuid=v=>{assert.match(v,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);return quote(v)+'::uuid';};
const service=createClient(apiOrigin,values.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const client=()=>createClient(apiOrigin,values.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const password='Ct15!'+randomBytes(24).toString('hex');
creds.push(password);
const roles=['owner','editor','staff_writer','freelancer','moderator','reader','legacy'];
const users={};
let browser,app;
try{
 mark('fresh local platform guard');
 check('fresh app schema and real managed storage helper',sql('fresh guard',['-Atc',"select (to_regclass('public.profiles') is null and to_regclass('public.staff_memberships') is null and to_regprocedure('storage.allow_only_operation(text)') is not null)::text"])==='true');
 const legacy=readdirSync('supabase/migrations').filter(x=>/^20260.*\.sql$/.test(x)).sort();
 const omitted=new Set(['20260830171808_dev_auth_bypass_policies.sql','20260908_dev_editorial_profiles_update.sql']);
 assert.equal(legacy.length,23);
 for(const name of legacy){
  if(omitted.has(name))continue;
  if(name==='20260902_create_comments.sql')apply('tests/fixtures/ct15-local-legacy-profile.sql');
  if(name==='20260908_editorial_profiles_editor_update.sql')apply('tests/fixtures/ct15-local-legacy-extras.sql');
  apply('supabase/migrations/'+name);
 }
 mark('legacy baseline grants and removal of embedded dev policies');
 // Only legacy fixture grants, never re-grant privileges after forward migrations.
 const seed=readFileSync('tests/fixtures/ct15-local-legacy-seed.sql','utf8').split('insert into auth.users')[0];
 assert.ok(seed.includes('drop policy')&&!seed.includes('insert into auth.users'));
 sql('legacy grant setup',['-f','-'],seed);
 mark('real Auth admin create seven synthetic users');
 for(const role of roles){
  const email='ct15-'+role+'@example.test';
  const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true});
  assert.ok(!error&&data.user?.id,'local Auth create '+role);
  users[role]={email,id:data.user.id};
 }
 const storyIds={public:randomUUID(),registered:randomUUID(),premium:randomUUID(),assigned:randomUUID(),other:randomUUID()};
 const storyRows=Object.entries(storyIds).map(([kind,id])=>{
  const status=['assigned','other'].includes(kind)?'draft':'published';
  const access=['registered','premium'].includes(kind)?kind:'public';
  return '('+[uuid(id),quote('ct15-'+kind),quote('CT15 '+kind+' story'),quote(status),quote(access),status==='draft'?'null':"now()-interval '1 day'",uuid(users.legacy.id),uuid(users.legacy.id),quote(JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'CT15 synthetic story copy'}]}]}))+'::jsonb'].join(',')+')';
 });
 mark('synthetic legacy content seed through database owner');
 sql('legacy content',['-f','-'],"update public.profiles set is_editor=true,is_author=true where id="+uuid(users.legacy.id)+";\n"+
 "update public.profiles set display_name='CT15 Reader' where id="+uuid(users.reader.id)+";\n"+
 "insert into public.stories(id,slug,headline,status,access_level,published_at,author_id,created_by,body) values "+storyRows.join(',')+";\n"+
 "insert into public.story_revisions(story_id,headline,slug,author_id,created_by) values("+uuid(storyIds.public)+",'CT15 unpublished revision','ct15-public',"+uuid(users.legacy.id)+","+uuid(users.legacy.id)+");");
 const manifest=readFileSync('docs/clear-talks/CT15_FORWARD_MIGRATION_MANIFEST.md','utf8');
 const forward=[...manifest.matchAll(/^\d+\. \x60(supabase\/migrations\/202611[^\x60]+\.sql)\x60$/gm)].map(m=>m[1]);
 assert.deepEqual(forward,readdirSync('supabase/migrations').filter(x=>/^202611.*\.sql$/.test(x)).sort().map(x=>'supabase/migrations/'+x));assert.equal(forward.length,38);
 function grantSql(role){
  const grants=PROPOSED_STAFF_ROLE_GRANTS[role];
  assert.ok(grants?.length);
  return 'insert into public.staff_role_capabilities(role_preset_id,capability_key,scope) select id,g.cap::public.staff_capability_key,g.scope from public.staff_role_presets cross join (values '+grants.map(g=>'('+quote(g.capability)+','+quote(g.scope)+')').join(',')+') g(cap,scope) where role_key='+quote(role)+';';
 }
 for(const path of forward){
  // Owner template becomes immutable at CT03c. Only the LOCAL fixture
  // preloads the proposed owner template before this migration; no trigger disable.
  if(basename(path)==='20261124034804_ct03c_role_grant_editor.sql'){
   mark('local test owner template before immutable preset guard');
   check('no automatic staff enrollment or grants before fixture',sql('empty grants',['-Atc',"select ((select count(*) from public.staff_memberships)=0 and (select count(*) from public.staff_role_capabilities)=0)::text"])==='true');
   sql('local owner template',['-f','-'],grantSql('owner'));
  }
  apply(path);
 }
 mark('explicit disposable staff fixtures');
 const staff=roles.filter(x=>x!=='reader'&&x!=='legacy');
 const inserts=staff.map(role=>{
  const id=uuid(users[role].id);
  return "insert into public.staff_memberships(auth_user_id,status,member_type,activated_at) values("+id+",'active',"+quote(role==='freelancer'?'freelancer':'employee')+",now());\n"+
  "insert into public.staff_member_roles(membership_id,role_preset_id) select m.id,p.id from public.staff_memberships m cross join public.staff_role_presets p where m.auth_user_id="+id+" and p.role_key="+quote(role)+";";
 });
 sql('staff fixtures',['-f','-'],"begin;\nset local app.staff_reason='Disposable CT15 synthetic role fixture';\n"+staff.filter(r=>r!=='owner').map(grantSql).join('\n')+'\n'+inserts.join('\n')+'\n'+
 "insert into public.staff_story_assignments(story_id,membership_id,assignment_type) select "+uuid(storyIds.assigned)+",id,'author' from public.staff_memberships where auth_user_id="+uuid(users.freelancer.id)+";\ncommit;\nnotify pgrst,'reload schema';");
 mark('seed synthetic historical published comment for report workflow');
 const reportTargetId=randomUUID();
 sql('local published comment fixture',['-f','-'],"insert into public.comments(id,story_id,user_id,body,status) values("+uuid(reportTargetId)+","+uuid(storyIds.public)+","+uuid(users.legacy.id)+",'CT15 synthetic report target','published');");
 let submittedCommentId,submittedReportId,approvedDraft,approvedRevision,mediaDraftId,rejectedMediaDraftId,redemptionCode,privacyRequestId;
 mark('real JWT and REST boundaries');
 const anonymous=client();
 const anonStories=await anonymous.from('stories').select('slug').like('slug','ct15-%').order('slug');
 check('anon sees only public story',!anonStories.error&&JSON.stringify(anonStories.data.map(x=>x.slug))==='["ct15-public"]');
 for(const role of roles){
  const c=client(),login=await c.auth.signInWithPassword({email:users[role].email,password});
  check(role+' genuine Auth password login',!login.error&&login.data.user?.id===users[role].id);
  const current=await c.auth.getUser();
  check(role+' verified JWT user',!current.error&&current.data.user?.id===users[role].id);
  users[role].client=c;
 }
 const reader=users.reader.client,legacyUser=users.legacy.client,free=users.freelancer.client,owner=users.owner.client;
 for(const [role,c] of [['reader',reader],['legacy',legacyUser]]){
  const read=await c.from('stories').select('slug').like('slug','ct15-%').order('slug');
  check(role+' cannot see drafts or paid story',!read.error&&JSON.stringify(read.data.map(x=>x.slug))==='["ct15-public","ct15-registered"]');
 }
 const scoped=await free.from('stories').select('slug').in('slug',['ct15-assigned','ct15-other']);
 check('freelancer only sees assigned draft',!scoped.error&&JSON.stringify(scoped.data.map(x=>x.slug))==='["ct15-assigned"]');
 const all=await owner.from('stories').select('slug').in('slug',['ct15-assigned','ct15-other']);
 check('owner sees both drafts',!all.error&&all.data.length===2);
 const deny=await reader.rpc('staff_reserve_private_upload',{p_extension:'png'});
 check('reader reservation denied',!!deny.error);
 mark('real Storage API quota and object access');
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aW1cAAAAASUVORK5CYII=','base64');
 const reserve=await free.rpc('staff_reserve_private_upload',{p_extension:'png'});
 check('freelancer reserved private object',!reserve.error&&typeof reserve.data==='string'&&reserve.data.startsWith('drafts/'+users.freelancer.id+'/'));
 const path=reserve.data;
 const unreserved=await free.storage.from('media-drafts').upload('drafts/'+users.freelancer.id+'/unreserved.png',bytes,{contentType:'image/png',upsert:false});
 check('real Storage rejects unreserved upload',!!unreserved.error);
 const signed=await free.storage.from('media-drafts').createSignedUploadUrl(path);
 check('real Storage rejects signed upload path',!!signed.error);
 const upload=await free.storage.from('media-drafts').upload(path,bytes,{contentType:'image/png',upsert:false});
 check('real Storage accepts reserved standard upload',!upload.error);
 const own=await free.storage.from('media-drafts').download(path);
 check('freelancer reads own private bytes',!own.error&&Buffer.compare(Buffer.from(await own.data.arrayBuffer()),bytes)===0);
 const other=await reader.storage.from('media-drafts').download(path);
 check('reader denied private bytes',!!other.error);
 const publicUpload=await free.storage.from('media').upload('uploads/ct15-bypass.png',bytes,{contentType:'image/png',upsert:false});
 check('freelancer cannot evade quota via public bucket',!!publicUpload.error);
 // No provider sends, cron, payments or destructive jobs. Public poll APP flag is local-only; DB voting stays off until the final disposable poll scenario.
 const flags={
  DEV_AUTH_BYPASS:'false',CT_STAFF_ACCESS_V2_ENABLED:'true',CT_READER_ACCOUNT_ENABLED:'true',
  CT_STAFF_ONBOARDING_ENABLED:'true',CT_MEDIA_PRIVATE_DRAFTS_ENABLED:'true',
  CT_COMMENT_MODERATION_ENABLED:'true',CT_COMMENT_REPORTS_ENABLED:'true',
  CT_ASSIGNED_DRAFT_EDITOR_ENABLED:'true',CT_ASSIGNED_REVISION_EDITOR_ENABLED:'true',
  CT_WRITER_DRAFT_CREATION_ENABLED:'true',CT_STORY_REVIEW_ENABLED:'true',
  CT_STAFF_ADMIN_MUTATIONS_ENABLED:'true',CT_READER_COMMUNICATIONS_ENABLED:'true',
  CT_EDITORIAL_CALENDAR_ENABLED:'true',CT_POLLS_ENABLED:'true',CT_PUBLIC_POLLS_ENABLED:'true',CT_REVIEW_INBOX_ENABLED:'true',CT_STORY_ASSIGNMENTS_ENABLED:'true',
  CT_HOMEPAGE_HISTORY_ENABLED:'true',CT_READER_REPORTING_ENABLED:'true',
  CT_REVIEWED_PUBLICATION_ENABLED:'true',CT_REVIEWED_SCHEDULING_ENABLED:'true',CT_STAFF_INVITATIONS_ENABLED:'true',CT_STAFF_PRESET_MUTATIONS_ENABLED:'true',CT_STAFF_OVERRIDE_MUTATIONS_ENABLED:'true',CT_STAFF_BYLINE_REVIEW_ENABLED:'true'
 };
 const appEnv={...process.env,...flags,NEXT_PUBLIC_SUPABASE_URL:apiOrigin,NEXT_PUBLIC_SUPABASE_ANON_KEY:values.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:values.SERVICE_ROLE_KEY};
 // Remove every other feature gate and provider credential inherited from the environment.
 for(const key of Object.keys(appEnv))if((key.startsWith('CT_')&&!Object.hasOwn(flags,key))||/RESEND|CRON_SECRET|STRIPE|SMTP|VERCEL_TOKEN/.test(key))delete appEnv[key];
 mark('build with real local stack');
 const build=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{env:appEnv,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
 writeFileSync(resolve(output,'build.log'),redact((build.stdout??'')+(build.stderr??'')));
 assert.equal(build.status,0,'local application build');
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3016'],{env:appEnv,stdio:['ignore','pipe','pipe']});
 const log=chunk=>{const msg=redact(chunk);if(msg.trim())console.log(msg.slice(0,1000));};app.stdout.on('data',log);app.stderr.on('data',log);
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(appOrigin+'/en',{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 check('local built application ready',ready);
 const {chromium}=await import(pathToFileURL(resolve(process.env.CT15_PLAYWRIGHT_MODULE)).href);
 browser=await chromium.launch({headless:true});
 // Reviewer runs after contributor submission. No shared browser cookies.
 for(const role of ['owner','staff_writer','freelancer','editor','reader','moderator','legacy']){
  mark('authenticated browser '+role);
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  let page;
  try{
   await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.origin===appOrigin&&(['GET','HEAD'].includes(method)||(method==='POST'&&['/api/newsroom/onboarding','/api/account/profile','/api/newsroom/contributor/stories'].includes(url.pathname))||(method==='PUT'&&/^\/api\/newsroom\/contributor\/stories\/[0-9a-f-]{36}$/.test(url.pathname))||(role==='reader'&&method==='DELETE'&&url.pathname==='/api/bookmarks/stories/'+storyIds.public)))return route.continue();
    if(url.origin===apiOrigin&&(method==='OPTIONS'||(['GET','HEAD'].includes(method)&&url.pathname.startsWith('/auth/v1/'))||method==='POST'&&['/auth/v1/token','/auth/v1/logout'].includes(url.pathname)))return route.continue();
    return route.abort();
   });
   page=await context.newPage();page.setDefaultTimeout(15000);
   const runtime=[];page.on('pageerror',e=>runtime.push(redact(e.message).slice(0,200)));
   // Record only safe method/path/status and actual browser Origin, never body/cookies.
   page.on('response',async r=>{if(!['POST','PUT'].includes(r.request().method())||!r.url().startsWith(appOrigin+'/api/'))return;const origin=await r.request().headerValue('origin').catch(()=>null);console.log('BROWSER '+r.request().method()+' '+new URL(r.url()).pathname+' HTTP '+r.status()+' Origin '+redact(origin??'(missing)'));});
   await page.goto(appOrigin+'/en/auth/sign-in?next=%2Faccount',{waitUntil:'domcontentloaded',timeout:20000});
   await page.locator('#email').fill(users[role].email);await page.locator('#password').fill(password);
   await page.locator('form button[type="submit"]').click();
   await page.waitForURL(url=>url.origin===appOrigin&&url.pathname==='/account',{timeout:20000});
   await page.locator('#account-main').waitFor({state:'visible'});
   check(role+' actual login and account shell',true);
   const account=await context.request.get(appOrigin+'/api/account/profile');
   check(role+' cookie-authenticated profile API (HTTP '+account.status()+')',account.status()===200&&(await account.json()).email===users[role].email);
   check(role+' account newsroom navigation matches current role',(await page.locator('a[href="/newsroom"]').count()>0)===!['reader','legacy'].includes(role));
   await page.goto(appOrigin+'/en',{waitUntil:'domcontentloaded',timeout:20000});
   check(role+' public header scoped newsroom navigation',(await page.locator('header a[href="/newsroom"]').count()>0)===!['reader','legacy'].includes(role));
   if(role==='reader'){
    const initial=await (await context.request.get(appOrigin+'/api/account/profile')).json();
    const payload={action:'profile',expectedUpdatedAt:initial.updatedAt,displayName:'CT15 Updated Reader',locale:'es',avatar:'ocean'};
    const cross=await context.request.post(appOrigin+'/api/account/profile',{headers:{Origin:'http://untrusted.example.test'},data:payload});
    check('reader cross-origin mutation denied (HTTP '+cross.status()+')',cross.status()===403);
    await page.goto(appOrigin+'/account/profile',{waitUntil:'load',timeout:20000});
    const form=page.locator('#account-main form').filter({has:page.getByLabel('Display name',{exact:true})});
    await form.locator('button[type=submit]').waitFor({state:'visible'});
    await page.locator('#account-main form[aria-busy="false"]').waitFor({state:'visible',timeout:10000});
    await form.getByLabel('Display name',{exact:true}).fill(payload.displayName);
    await form.getByLabel('Account language',{exact:true}).selectOption('es');
    await form.getByLabel('Choose avatar',{exact:true}).selectOption('ocean');
    const [change]=await Promise.all([
      page.waitForResponse(r=>r.url()===appOrigin+'/api/account/profile'&&r.request().method()==='POST'),
      form.getByRole('button',{name:'Save profile',exact:true}).click()
    ]);
    const sent=change.request().postDataJSON();
    const savedProfile=await change.json();
    const fields={nameSent:sent.displayName===payload.displayName,localeSent:sent.locale===payload.locale,avatarSent:sent.avatar===payload.avatar,revisionSent:sent.expectedUpdatedAt===payload.expectedUpdatedAt,nameSaved:savedProfile.displayName===payload.displayName,localeSaved:savedProfile.locale==='es',avatarSaved:savedProfile.image==='/avatars/reader-ocean.svg'};
    console.log('READER PROFILE FIELD MATCHES '+JSON.stringify(fields));
    check('reader actual profile form save (HTTP '+change.status()+')',change.status()===200&&Object.values(fields).every(Boolean));
    await page.getByRole('heading',{name:'Mi perfil',exact:true}).waitFor({state:'visible',timeout:15000});
    const stale=await page.evaluate(async timestamp=>{
      const r=await fetch('/api/account/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',expectedUpdatedAt:timestamp,displayName:'Stale overwrite',locale:'en',avatar:'initials'})});
      return r.status;
    },initial.updatedAt);
    check('reader stale profile rejected (HTTP '+stale+')',stale===409);
    const retained=await context.request.get(appOrigin+'/api/account/profile');
    const persisted=await retained.json();
    check('reader saved identity retained',retained.status()===200&&persisted.displayName===payload.displayName&&persisted.locale==='es'&&persisted.image==='/avatars/reader-ocean.svg');
    await page.reload({waitUntil:'load'});
    await page.locator('#account-main form[aria-busy="false"]').waitFor({state:'visible',timeout:10000});
    check('reader reloaded form reflects all saved preferences',await page.getByLabel('Nombre visible',{exact:true}).inputValue()===payload.displayName&&await page.getByLabel('Idioma de la cuenta',{exact:true}).inputValue()==='es'&&await page.locator('#account-main form img[src="/avatars/reader-ocean.svg"]').count()===1);
    const post=(path,data)=>context.request.post(appOrigin+path,{headers:{Origin:appOrigin},data});
    const request=await post('/api/account/profile',{action:'request',kind:'export',confirmation:'EXPORT'});
    check('reader privacy export request recorded (HTTP '+request.status()+')',request.status()===200);
    const receipt=(await request.json()).requests.find(r=>r.kind==='export'&&r.status==='pending');
    assert.ok(receipt);
    const repeated=await post('/api/account/profile',{action:'request',kind:'export',confirmation:'EXPORT'});
    check('reader privacy request idempotent',repeated.status()===200&&(await repeated.json()).requests.filter(r=>r.kind==='export'&&r.status==='pending').length===1);
    const cancel=await post('/api/account/profile',{action:'cancel',id:receipt.id,confirmation:'CANCEL'});
    check('reader privacy request cancelled',cancel.status()===200&&(await cancel.json()).requests.some(r=>r.id===receipt.id&&r.status==='cancelled'));
    const exported=await context.request.get(appOrigin+'/api/account/export');
    check('reader export own bounded snapshot (HTTP '+exported.status()+')',exported.status()===200);
    const snapshot=await exported.json();
    check('reader export excludes other identities',snapshot.scope==='reader_snapshot_v1'&&snapshot.account.email===users.reader.email&&!JSON.stringify(snapshot).includes(users.owner.email));
    const privacy=await context.request.get(appOrigin+'/api/newsroom/privacy');
    check('reader cannot access staff privacy queue',privacy.status()===403);
    const notices=await context.request.get(appOrigin+'/api/account/notifications');
    check('reader notifications available (HTTP '+notices.status()+')',notices.status()===200);
    const prefs=(await notices.json()).preferences;
    const changes={action:'preferences',expectedRevision:prefs.revision,stories:true,replies:true,privacy:true,page:0};
    const updated=await post('/api/account/notifications',changes);
    check('reader notification preferences persisted',updated.status()===200&&(await updated.json()).preferences.stories===changes.stories);
    const outdated=await post('/api/account/notifications',changes);
    check('reader stale preference write rejected',outdated.status()===409);
    const deletion=await post('/api/account/profile',{action:'request',kind:'delete',confirmation:'DELETE'});
    check('reader submits deletion request without deleting account',deletion.status()===200);
    privacyRequestId=(await deletion.json()).requests.find(r=>r.kind==='delete'&&r.status==='pending')?.id;
    check('deletion request receipt is pending',typeof privacyRequestId==='string');
    const stillSignedIn=await context.request.get(appOrigin+'/api/account/profile');
    check('request does not revoke reader session',stillSignedIn.status()===200);
    const premature=await post('/api/polls/'+randomUUID()+'/vote',{choice:0});
    check('database poll activation remains off',premature.status()===403);
    check('reader denied staff invitation directory',(await context.request.get(appOrigin+'/api/newsroom/team/invitations')).status()===403);
    check('unrelated verified reader cannot redeem invitation',(await context.request.post(appOrigin+'/api/newsroom/team/invitations',{headers:{Origin:appOrigin},data:{action:'redeem',token:redemptionCode}})).status()===403);
    check('reader denied private byline queue',(await context.request.get(appOrigin+'/api/newsroom/team/bylines')).status()===403);
    check('reader denied homepage versioned editor',(await context.request.get(appOrigin+'/api/front-page/history')).status()===403);
    check('reader denied private media list',(await context.request.get(appOrigin+'/api/media/drafts')).status()===403);
    check('reader denied private media preview',(await context.request.get(appOrigin+'/api/media/drafts/'+mediaDraftId+'/preview')).status()===403);
    const bookmarkPath='/api/bookmarks/stories/'+storyIds.public,bookmark=appOrigin+bookmarkPath;
    const beforeBookmark=await context.request.get(bookmark);
    check('reader bookmark initially absent',beforeBookmark.status()===200&&(await beforeBookmark.json()).bookmarked===false);
    const hostileBookmark=await context.request.post(bookmark,{headers:{Origin:'https://untrusted.example.test'},data:{}});
    check('cross-origin bookmark write rejected',hostileBookmark.status()===403);
    const savedBookmark=await post(bookmarkPath,{});
    check('reader saves public story (HTTP '+savedBookmark.status()+')',savedBookmark.status()===201&&(await savedBookmark.json()).bookmarked===true);
    check('repeat bookmark succeeds',(await post(bookmarkPath,{})).status()===201);
    check('reader cannot bookmark inaccessible premium story',(await post('/api/bookmarks/stories/'+storyIds.premium,{})).status()===404);
    check('reader cannot bookmark private draft',(await post('/api/bookmarks/stories/'+storyIds.assigned,{})).status()===404);
    const savedRows=await reader.from('bookmarks').select('story_id').eq('story_id',storyIds.public);
    const unrelatedRows=await legacyUser.from('bookmarks').select('story_id').eq('story_id',storyIds.public);
    check('bookmark replay creates exactly one own row, invisible to other reader',!savedRows.error&&savedRows.data.length===1&&!unrelatedRows.error&&unrelatedRows.data.length===0);
    await page.goto(appOrigin+'/account/saved',{waitUntil:'load',timeout:20000});
    const savedArticle=page.locator('#account-main article').filter({has:page.getByRole('heading',{name:'CT15 public story',exact:true})});
    await savedArticle.waitFor({state:'visible'});
    check('saved story appears in real account page',await savedArticle.count()===1);
    await page.screenshot({path:resolve(output,'reader-saved-story.png'),fullPage:true,timeout:10000,animations:'disabled'});
    const hostileDelete=await context.request.delete(bookmark,{headers:{Origin:'https://untrusted.example.test'}});
    check('cross-origin bookmark removal rejected',hostileDelete.status()===403);
    const [removed]=await Promise.all([page.waitForResponse(r=>r.url()===bookmark&&r.request().method()==='DELETE'),savedArticle.locator('button[aria-pressed="true"]').click()]);
    check('saved page actual remove button succeeds',removed.status()===200&&(await removed.json()).bookmarked===false);
    await savedArticle.waitFor({state:'detached'});
    const afterBookmark=await context.request.get(bookmark);
    check('bookmark removed after actual UI action',afterBookmark.status()===200&&(await afterBookmark.json()).bookmarked===false);
    const commentPath='/api/stories/'+storyIds.public+'/comments';
    check('reader cannot comment on private draft',(await post('/api/stories/'+storyIds.assigned+'/comments',{body:'CT15 denied draft comment'})).status()===404);
    const hostileComment=await context.request.post(appOrigin+commentPath,{headers:{Origin:'https://untrusted.example.test'},data:{body:'CT15 denied hostile comment'}});
    check('cross-origin comment creation rejected',hostileComment.status()===403);
    const wrongType=await context.request.post(appOrigin+commentPath,{headers:{Origin:appOrigin,'Content-Type':'text/plain'},data:'{"body":"CT15 denied content type"}'});
    check('comment creation rejects non-JSON content type',wrongType.status()===415);
    check('comment creation rejects non-object JSON',(await context.request.post(appOrigin+commentPath,{headers:{Origin:appOrigin,'Content-Type':'application/json'},data:'null'})).status()===400);
    check('comment creation rejects forged ownership field',(await post(commentPath,{body:'CT15 forged comment',userId:users.legacy.id})).status()===422);
    const newComment=await post(commentPath,{body:'CT15 pending reader comment'});
    check('reader submits pending comment (HTTP '+newComment.status()+')',newComment.status()===201);
    const pendingComment=(await newComment.json()).comment;
    check('comment owner and pending state derived by server',pendingComment.userId===users.reader.id&&pendingComment.status==='pending');
    submittedCommentId=pendingComment.id;
    const ownComment=appOrigin+'/api/account/comments/'+submittedCommentId;
    const hostileEdit=await context.request.patch(ownComment,{headers:{Origin:'https://untrusted.example.test'},data:{body:'CT15 hostile edit'}});
    check('cross-origin comment edit rejected',hostileEdit.status()===403);
    check('cross-origin comment removal rejected',(await context.request.delete(ownComment,{headers:{Origin:'https://untrusted.example.test'}})).status()===403);
    const edited=await context.request.patch(ownComment,{headers:{Origin:appOrigin},data:{body:'CT15 updated pending reader comment'}});
    check('same-origin reader edit remains pending',edited.status()===200&&(await edited.json()).comment.body==='CT15 updated pending reader comment');
    const disposable=await post(commentPath,{body:'CT15 disposable comment for removal'});
    check('reader creates separate removable comment',disposable.status()===201);
    const disposableId=(await disposable.json()).comment.id;
    const removedComment=await context.request.delete(appOrigin+'/api/account/comments/'+disposableId,{headers:{Origin:appOrigin}});
    check('same-origin reader removal succeeds',removedComment.status()===200&&(await removedComment.json()).deleted===true);
    const thread=await context.request.get(appOrigin+commentPath);
    check('public thread read succeeds',thread.status()===200);
    const publicComments=(await thread.json()).comments;
    check('public thread excludes even own pending comment',!publicComments.some(c=>c.id===submittedCommentId));
    const target=publicComments.find(c=>c.id===reportTargetId);
    check('published synthetic report target appears in public thread',!!target);
    const reportPath='/api/stories/'+storyIds.public+'/reports';
    const reportCommand={commentId:reportTargetId,updatedAt:target.updatedAt,reason:'CT15 synthetic community guideline concern'};
    check('stale public comment report denied',(await post(reportPath,{...reportCommand,updatedAt:'2000-01-01T00:00:00.000Z'})).status()===409);
    const reported=await post(reportPath,reportCommand);
    check('reader submits report (HTTP '+reported.status()+')',reported.status()===200);
    const receiptReport=await reported.json();
    submittedReportId=receiptReport.report.id;
    check('new report private receipt',receiptReport.alreadyReported===false&&receiptReport.report.status==='open'&&!('reporterId' in receiptReport.report));
    const retryReport=await post(reportPath,reportCommand);
    const retried=await retryReport.json();
    check('report retry returns same receipt',retryReport.status()===200&&retried.alreadyReported===true&&retried.report.id===submittedReportId);
    const ownReports=await context.request.get(appOrigin+'/api/account/reports');
    check('reader sees own open report history',ownReports.status()===200&&(await ownReports.json()).items.some(r=>r.id===submittedReportId&&r.status==='open'));
    check('reader denied moderation detail',(await context.request.get(appOrigin+'/api/newsroom/comments?commentId='+submittedCommentId)).status()===403);
    check('reader denied staff report detail',(await context.request.get(appOrigin+'/api/newsroom/comments/reports?reportId='+submittedReportId)).status()===403);
    const newsletters=await context.request.get(appOrigin+'/api/account/newsletters');
    check('reader newsletter topics visible without delivery',newsletters.status()===200&&(await newsletters.json()).deliveryEnabled===false);
    const subscribe=await post('/api/account/newsletters',{action:'subscribe',topic:'latest'});
    check('newsletter send stays disabled (HTTP '+subscribe.status()+')',subscribe.status()===503);
    const optOut=await post('/api/account/newsletters',{action:'unsubscribe',topic:'latest'});
    check('reader can unsubscribe even with delivery disabled',optOut.status()===200&&(await optOut.json()).topics.some(t=>t.topic==='latest'&&t.status==='unsubscribed'));
    check('unsupported newsletter topic rejected',(await post('/api/account/newsletters',{action:'unsubscribe',topic:'forged'})).status()===422);
   }
   const team=await context.request.get(appOrigin+'/api/newsroom/team');
   check(role+' team route authorization (HTTP '+team.status()+')',team.status()===(role==='owner'?200:404));
   if(role==='owner'){
    const directory=await team.json();
    check('owner sees exactly five synthetic members and own row',directory.totalMembers===5&&directory.members.filter(m=>m.isSelf).length===1);
    check('owner local role, override and preset mutation flags',directory.mutationsEnabled===true&&directory.overrideMutationsEnabled===true&&directory.presetMutationsEnabled===true);
    check('owner directory excludes raw Auth emails and invitation secrets',!JSON.stringify(directory).includes('@example.test')&&!JSON.stringify(directory).includes('token_hash'));
    const editorMember=directory.members.find(m=>m.roles.some(r=>r.roleKey==='editor'));
    const self=directory.members.find(m=>m.isSelf);
    assert.ok(editorMember&&self);
    const endpoint=appOrigin+'/api/newsroom/team/role-change';
    const mutate=(data,origin=appOrigin)=>context.request.post(endpoint,{headers:{Origin:origin},data});
    const grant={targetMembershipId:editorMember.id,operation:'grant_role',roleKey:'moderator',reason:'CT15 disposable role grant and revoke test'};
    check('owner hostile origin role mutation rejected',(await mutate(grant,'https://untrusted.example.test')).status()===403);
    check('owner cannot demote self',(await mutate({targetMembershipId:self.id,operation:'revoke_role',roleKey:'owner',reason:'CT15 synthetic self demotion rejection'})).status()===409);
    const granted=await mutate(grant);
    check('owner actual role grant API (HTTP '+granted.status()+')',granted.status()===200);
    const afterGrant=await (await context.request.get(appOrigin+'/api/newsroom/team')).json();
    check('granted role appears in team directory',afterGrant.members.find(m=>m.id===editorMember.id)?.roles.some(r=>r.roleKey==='moderator'));
    const revoked=await mutate({...grant,operation:'revoke_role'});
    check('owner actual role revoke API (HTTP '+revoked.status()+')',revoked.status()===200);
    const afterRevoke=await (await context.request.get(appOrigin+'/api/newsroom/team')).json();
    check('role revoked without affecting editor role',afterRevoke.members.find(m=>m.id===editorMember.id)?.roles.map(r=>r.roleKey).join(',')==='editor');
    const audit=await service.from('staff_access_audit').select('actor_auth_user_id,action_key,request_id').in('request_id',[(await granted.json()).requestId,(await revoked.json()).requestId]);
    check('owner role change audit attribution',!audit.error&&audit.data.length===2&&audit.data.every(a=>a.actor_auth_user_id===users.owner.id));
    const invitations=appOrigin+'/api/newsroom/team/invitations';
    const preset=directory.presets.find(p=>p.key==='moderator');
    check('synthetic moderator template initially has grants but no reviewed revision',preset?.grantRevision===0&&preset.configuredGrants.length>1);
    const presetUrl=appOrigin+'/api/newsroom/team/preset-change';
    const presetPost=data=>context.request.post(presetUrl,{headers:{Origin:appOrigin},data});
    const presetCommand={roleKey:'moderator',expectedRevision:preset.grantRevision,grants:preset.configuredGrants.filter(g=>g.capability!=='comment.manage_reports'),reason:'CT15 explicitly review disposable moderator matrix',confirmed:true};
    const savedPreset=await presetPost(presetCommand);
    check('owner saves actual versioned moderator preset (HTTP '+savedPreset.status()+')',savedPreset.status()===200&&(await savedPreset.json()).revision===1);
    check('stale role preset save rejected',(await presetPost(presetCommand)).status()===409);
    const restoredPreset=await presetPost({...presetCommand,expectedRevision:1,grants:preset.configuredGrants});
    check('owner restores original moderator grants with reviewed revision',restoredPreset.status()===200&&(await restoredPreset.json()).revision===2);
    const currentDirectory=await (await context.request.get(appOrigin+'/api/newsroom/team')).json();
    const reviewedPreset=currentDirectory.presets.find(p=>p.key==='moderator');
    check('configured moderator preset available for invitation',reviewedPreset?.grantRevision===2&&reviewedPreset.configuredGrants.length===preset.configuredGrants.length);
    const overrideUrl=appOrigin+'/api/newsroom/team/override-change';
    const effectiveUrl=appOrigin+'/api/newsroom/team/'+editorMember.id+'/effective';
    const overridePost=data=>context.request.post(overrideUrl,{headers:{Origin:appOrigin},data});
    const beforeOverride=await context.request.get(effectiveUrl);
    check('owner reads editor effective access',beforeOverride.status()===200&&(await beforeOverride.json()).permissions.some(p=>p.capability==='story.publish'&&p.state==='allowed'));
    const override={targetMembershipId:editorMember.id,operation:'set',capability:'story.publish',scope:'all',effect:'deny',expiresAt:null,reason:'CT15 temporary deny of editor publication'};
    const deniedOverride=await overridePost(override);
    check('owner sets actual explicit permission deny',deniedOverride.status()===200);
    const denyEffective=await context.request.get(effectiveUrl);
    check('effective preview reflects explicit deny',denyEffective.status()===200&&(await denyEffective.json()).permissions.some(p=>p.capability==='story.publish'&&p.state==='denied'&&p.explanation==='explicit_deny'));
    const removedOverride=await overridePost({...override,operation:'remove',effect:null,expiresAt:null});
    check('owner removes temporary permission deny',removedOverride.status()===200);
    const restoredEffective=await context.request.get(effectiveUrl);
    check('removal restores editor publication permission',restoredEffective.status()===200&&(await restoredEffective.json()).permissions.some(p=>p.capability==='story.publish'&&p.state==='allowed'));
    const invitation={action:'issue',input:{email:'ct15-invited@example.test',roleKey:'moderator',memberType:'employee',expectedPresetRevision:reviewedPreset.grantRevision,expiresAt:new Date(Date.now()+86400000).toISOString(),membershipExpiresAt:null,reason:'CT15 disposable invitation review',confirmed:true}};
    const issue=await context.request.post(invitations,{headers:{Origin:appOrigin},data:invitation});
    check('owner creates manual invitation without delivery (HTTP '+issue.status()+')',issue.status()===200);
    const issued=await issue.json();
    check('invitation code only returned to issuer',issued.ok===true&&issued.delivery==='manual'&&typeof issued.code==='string'&&issued.code.length===43);
    creds.push(issued.code);
    const list=await context.request.get(invitations);
    const listData=await list.json();
    check('invitation list masks identity and excludes code',list.status()===200&&listData.items.some(r=>r.invitationId===issued.invitationId&&r.status==='pending')&&!JSON.stringify(listData).includes(issued.code)&&!JSON.stringify(listData).includes(invitation.input.email));
    const cancel=await context.request.post(invitations,{headers:{Origin:appOrigin},data:{action:'cancel',id:issued.invitationId,reason:'CT15 cancel disposable invitation',confirmed:true}});
    check('owner cancels unused invitation',cancel.status()===200&&(await cancel.json()).ok===true);
    const afterCancel=await context.request.get(invitations);
    check('cancelled invitation history retained',afterCancel.status()===200&&(await afterCancel.json()).items.some(r=>r.invitationId===issued.invitationId&&r.status==='canceled'));
    const newInvite=await context.request.post(invitations,{headers:{Origin:appOrigin},data:{...invitation,input:{...invitation.input,email:'ct15-redeem@example.test'}}});
    check('owner issues separate redemption invitation',newInvite.status()===200);
    const newInviteJson=await newInvite.json();redemptionCode=newInviteJson.code;assert.equal(typeof redemptionCode,'string');creds.push(redemptionCode);
    const homepage=appOrigin+'/api/front-page/history';
    const initialHome=await context.request.get(homepage);
    check('owner loads versioned homepage layout',initialHome.status()===200);
    const home=await initialHome.json();
    check('synthetic homepage is editable',home.legacyBlocked===false);
    const selection=[{slot:'lead',position:0,storyId:storyIds.public,categoryId:null}];
    const homePost=(data)=>context.request.post(homepage,{headers:{Origin:appOrigin},data});
    const save={action:'save',expectedRevision:home.revision,selections:selection,restoreRevision:null};
    const draftHome=await homePost(save);
    check('homepage draft saves without changing public placements',draftHome.status()===200);
    const savedHome=await draftHome.json();
    check('homepage draft isolated from public layout',JSON.stringify(savedHome.published)===JSON.stringify(home.published)&&savedHome.selections.some(r=>r.storyId===storyIds.public));
    check('stale homepage save denied',(await homePost(save)).status()===409);
    const publishedHome=await homePost({...save,action:'publish',expectedRevision:savedHome.revision});
    check('owner publishes homepage selection',publishedHome.status()===200);
    const publicHome=await publishedHome.json();
    check('homepage publishes exact selection and version history',publicHome.published.some(r=>r.storyId===storyIds.public)&&publicHome.history.some(r=>r.revision===publicHome.revision));
    const restored=await homePost({action:'restore',expectedRevision:publicHome.revision,selections:null,restoreRevision:home.history[0]?.revision??0});
    check('homepage historical restore creates draft only',restored.status()===200);
    const restoreState=await restored.json();
    check('homepage restore does not change live selection',JSON.stringify(restoreState.published)===JSON.stringify(publicHome.published));
    const revert=await homePost({action:'revert',expectedRevision:restoreState.revision,selections:null,restoreRevision:null});
    check('homepage revert returns draft to current public layout',revert.status()===200&&(await revert.json()).selections.some(r=>r.storyId===storyIds.public));
    const reset=await homePost({action:'publish',expectedRevision:restoreState.revision+1,selections:home.published,restoreRevision:null});
    check('synthetic homepage original selection restored',reset.status()===200&&JSON.stringify((await reset.json()).published)===JSON.stringify(home.published));
    const assignments=appOrigin+'/api/newsroom/stories/'+storyIds.public+'/assignments';
    const listing=await context.request.get(assignments);
    check('owner actual assignment candidate API',listing.status()===200);
    const freelancerMember=directory.members.find(m=>m.roles.some(r=>r.roleKey==='freelancer'));
    const candidate=(await listing.json()).candidates.find(c=>c.id===freelancerMember.id);
    check('freelancer eligible for author assignment',candidate?.types.includes('author'));
    const assign=(data)=>context.request.post(assignments,{headers:{Origin:appOrigin},data});
    const dueAt=new Date(Date.now()+2*86400000).toISOString();
    const command={membershipId:freelancerMember.id,type:'author',action:'create',expectedRevision:0,dueAt,reason:'CT15 assign published story revision',requestId:randomUUID()};
    const assigned=await assign(command);
    check('owner creates real author assignment (HTTP '+assigned.status()+')',assigned.status()===200);
    const created=await assigned.json();
    check('assignment starts active revision one',created.status==='active'&&created.revision===1);
    const stale=await assign({...command,requestId:randomUUID()});
    check('duplicate assignment rejected',stale.status()===409);
    const movedDue=new Date(Date.now()+3*86400000).toISOString();
    const moved=await assign({...command,action:'reschedule',expectedRevision:created.revision,dueAt:movedDue,requestId:randomUUID()});
    check('assignment deadline rescheduled',moved.status()===200&&(await moved.json()).revision===2);
    const outdated=await assign({...command,action:'reschedule',expectedRevision:1,requestId:randomUUID()});
    check('stale assignment revision rejected',outdated.status()===409);
    const completed=await assign({...command,action:'complete',expectedRevision:2,dueAt:null,requestId:randomUUID()});
    check('assignment completion recorded',completed.status()===200&&(await completed.json()).status==='completed');
    const reopened=await assign({...command,action:'reopen',expectedRevision:3,dueAt:movedDue,requestId:randomUUID()});
    check('assignment reopened with current revision',reopened.status()===200&&(await reopened.json()).revision===4);
    const afterAssign=await context.request.get(assignments);
    const assignedState=await afterAssign.json();
    check('assignment history and deadline persisted',afterAssign.status()===200&&assignedState.assignments.some(a=>a.id===created.id&&a.status==='active'&&Date.parse(a.dueAt)===Date.parse(movedDue))&&assignedState.history.length>=4);
    const calendar=appOrigin+'/api/newsroom/calendar?'+new URLSearchParams({start:new Date(Date.now()-86400000).toISOString(),end:new Date(Date.now()+7*86400000).toISOString(),filter:'assignments'});
    const calendarResponse=await context.request.get(calendar);
    check('team calendar reflects reopened assignment',calendarResponse.status()===200&&(await calendarResponse.json()).items.some(a=>a.id===created.id&&a.kind==='assignment'));

   }
   await page.goto(appOrigin+'/newsroom',{waitUntil:'domcontentloaded',timeout:20000});
   if(role==='reader'||role==='legacy'){
    await page.waitForURL(url=>url.pathname==='/newsroom/denied',{timeout:15000});
    check(role+' newsroom denied despite valid login',true);
   }else{
    await page.waitForURL(url=>url.pathname==='/newsroom/onboarding',{timeout:15000});
    const onboarding=await context.request.get(appOrigin+'/api/newsroom/onboarding');
    check(role+' real onboarding state',onboarding.status()===200&&(await onboarding.json()).profile===null);
    const payload={expectedRevision:0,displayName:'CT15 '+role,locale:'en',bylineRequested:false,acknowledgedVersion:1};
    const cross=await context.request.post(appOrigin+'/api/newsroom/onboarding',{headers:{Origin:'http://untrusted.example.test'},data:{...payload,confirmed:true}});
    check(role+' cross-origin onboarding denied (HTTP '+cross.status()+')',cross.status()===403);
    const missingConfirmation=await page.evaluate(async payload=>{
      const r=await fetch('/api/newsroom/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      return r.status;
    },payload);
    check(role+' missing onboarding confirmation rejected (HTTP '+missingConfirmation+')',missingConfirmation===422);
    const form=page.locator('main form');
    await form.getByRole('textbox').fill(payload.displayName);
    await form.locator('select').selectOption('en');
    const submit=form.getByRole('button',{name:'Complete onboarding',exact:true});
    check(role+' form requires confirmation',!(await submit.isEnabled()));
    await form.getByLabel('I understand that access is limited', {exact:false}).check();
    const [saved]=await Promise.all([
      page.waitForResponse(r=>r.url()===appOrigin+'/api/newsroom/onboarding'&&r.request().method()==='POST'),
      submit.click()
    ]);
    check(role+' real form onboarding save (HTTP '+saved.status()+')',saved.status()===200&&(await saved.json()).profile?.revision===1);
    await form.getByRole('status').waitFor({state:'visible'});
    const stale=await page.evaluate(async payload=>{
      const r=await fetch('/api/newsroom/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,confirmed:true})});
      return r.status;
    },payload);
    check(role+' stale onboarding revision denied (HTTP '+stale+')',stale===409);
    await page.goto(appOrigin+'/newsroom',{waitUntil:'domcontentloaded',timeout:20000});
    const landing=['owner','editor'].includes(role)?'/newsroom':'/newsroom/contributor';
    await page.waitForURL(url=>url.pathname===landing,{timeout:15000});
    await page.locator('#newsroom-main').waitFor({state:'visible'});
    check(role+' scoped workspace landing',true);
    if(role==='freelancer'){
     await page.getByText('CT15 assigned story',{exact:true}).first().waitFor({state:'visible'});
     check('assigned story shown, unrelated draft absent',await page.getByText('CT15 other story',{exact:true}).count()===0);
    }
   }
   await page.screenshot({path:resolve(output,role+'-workspace.png'),fullPage:true,timeout:10000,animations:'disabled'});
   if(role==='owner'||role==='editor'){
    await page.goto(appOrigin+'/newsroom/stories',{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('#newsroom-main').waitFor({state:'visible'});
    check(role+' story list available',new URL(page.url()).pathname==='/newsroom/stories');
    await page.getByText('CT15 public story',{exact:true}).first().waitFor({state:'visible'});
    await page.screenshot({path:resolve(output,role+'-stories.png'),fullPage:true,timeout:10000,animations:'disabled'});
   }
   if(role==='freelancer'||role==='staff_writer'||role==='moderator'){
    await page.goto(appOrigin+'/newsroom/stories',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForURL(url=>url.pathname==='/newsroom/denied',{timeout:15000});
    check(role+' full story list denied',true);
   }
   if(role==='staff_writer'){
    // Prove the authenticated HTTP write and idempotency independently of UI.
    const endpoint=appOrigin+'/api/newsroom/contributor/stories';
    const payload={requestId:randomUUID(),headline:'CT15 API writer draft',language:'en'};
    const create=()=>context.request.post(endpoint,{headers:{Origin:appOrigin},data:payload});
    const first=await create();
    check('writer authenticated API creation (HTTP '+first.status()+')',first.status()===201);
    const apiId=(await first.json()).id;
    const replay=await create();
    check('writer same request returns original draft',replay.status()===201&&(await replay.json()).id===apiId);
    const collision=await context.request.post(endpoint,{headers:{Origin:appOrigin},data:{...payload,headline:'Different headline'}});
    check('writer request reuse with changed payload rejected',collision.status()===409);
    const assigned=await context.request.get(endpoint+'/'+apiId);
    check('writer API draft self-assigned and editable',assigned.status()===200&&(await assigned.json()).headline===payload.headline);
    await page.goto(appOrigin+'/newsroom/contributor',{waitUntil:'load',timeout:20000});
    const writerLink=page.locator('aside nav a[href="/newsroom/contributor/new"]');
    check('writer sidebar offers restricted draft form, not full editor',await writerLink.count()===1&&await page.locator('aside nav a[href="/newsroom/stories/new"]').count()===0);
    await writerLink.click();
    await page.waitForURL(url=>url.pathname==='/newsroom/contributor/new');
    check('writer new draft active nav only',await page.locator('aside nav [aria-current=page]').count()===1&&await writerLink.getAttribute('aria-current')==='page');
    const form=page.locator('#newsroom-main form');
    const headline=form.getByLabel('Headline',{exact:true});
    const submit=form.getByRole('button',{name:'Create draft',exact:true});
    // Hydration can replace initial DOM inputs. Retry input only, never a
    // mutation. A disabled submit must become enabled through normal typing.
    for(let attempt=0;attempt<3;attempt++){
      await headline.fill('');await headline.fill('CT15 writer-created draft');
      try{await page.waitForFunction(()=>{const b=document.querySelector('#newsroom-main form button[type=submit]');return b&&!b.disabled;},{},{timeout:3000});break;}catch{if(attempt===2)throw Error('Writer form did not enable submit after typing');}
    }
    check('writer form enabled by typed headline',await submit.isEnabled());
    const [result]=await Promise.all([
      page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST'),
      submit.click()
    ]);
    check('writer real form draft creation (HTTP '+result.status()+')',result.status()===201);
    const id=(await result.json()).id;
    assert.match(id,/^[0-9a-f-]{36}$/);
    await page.waitForURL(url=>url.pathname==='/newsroom/contributor/stories/'+id,{timeout:15000});
    await page.getByLabel('Headline',{exact:true}).waitFor({state:'visible'});
    const ownDraft=await context.request.get(appOrigin+'/api/newsroom/contributor/stories/'+id);
    check('writer created draft is immediately editable',ownDraft.status()===200&&(await ownDraft.json()).headline==='CT15 writer-created draft');
    const hidden=await reader.from('stories').select('id').eq('id',id);
    check('writer-created draft remains private',!hidden.error&&hidden.data.length===0);
    await page.screenshot({path:resolve(output,'writer-draft-editor.png'),fullPage:true,timeout:10000,animations:'disabled'});
   }
   if(role==='freelancer'){
    const endpoint='/api/newsroom/contributor/stories/'+storyIds.assigned;
    const initial=await context.request.get(appOrigin+endpoint);
    check('freelancer assigned draft API (HTTP '+initial.status()+')',initial.status()===200);
    const state=await initial.json();
    const unauthorized=await context.request.get(appOrigin+'/api/newsroom/contributor/stories/'+storyIds.other);
    check('freelancer unrelated draft API denied',unauthorized.status()===404);
    const cannotCreate=await context.request.post(appOrigin+'/api/newsroom/contributor/stories',{headers:{Origin:appOrigin},data:{requestId:randomUUID(),headline:'CT15 unauthorized draft',language:'en'}});
    check('freelancer unassigned draft creation denied (HTTP '+cannotCreate.status()+')',cannotCreate.status()===403);
    await page.goto(appOrigin+'/newsroom/contributor/stories/'+storyIds.assigned,{waitUntil:'load',timeout:20000});
    await page.getByLabel('Headline',{exact:true}).fill('CT15 assigned story edited');
    const [result]=await Promise.all([
      page.waitForResponse(r=>r.url()===appOrigin+endpoint&&r.request().method()==='PUT'),
      page.getByRole('button',{name:'Save',exact:true}).click()
    ]);
    check('freelancer actual editor copy save (HTTP '+result.status()+')',result.status()===200&&(await result.json()).headline==='CT15 assigned story edited');
    const stale=await page.evaluate(async ({endpoint,state})=>{
      const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',expectedUpdatedAt:state.updatedAt,copy:{headline:state.headline,subheadline:state.subheadline,summary:state.summary,body:state.body}})});
      return r.status;
    },{endpoint,state});
    check('freelancer stale draft write rejected (HTTP '+stale+')',stale===409);
    const retained=await context.request.get(appOrigin+endpoint);
    check('freelancer saved copy persisted',retained.status()===200&&(await retained.json()).headline==='CT15 assigned story edited');
    await page.screenshot({path:resolve(output,'freelancer-draft-editor.png'),fullPage:true,timeout:10000,animations:'disabled'});
    const review=appOrigin+'/api/newsroom/stories/'+storyIds.assigned+'/review';
    const source=await context.request.get(review+'?kind=draft');
    check('freelancer review state available (HTTP '+source.status()+')',source.status()===200);
    const snapshot=await source.json();
    check('freelancer can request but not decide',snapshot.canRequest===true&&snapshot.canDecide===false);
    const request={kind:'draft',action:'request',fingerprint:snapshot.fingerprint,requestId:null,note:'CT15 saved copy ready for independent review',commandId:randomUUID()};
    const submitted=await context.request.post(review,{headers:{Origin:appOrigin},data:request});
    check('freelancer atomic review request (HTTP '+submitted.status()+')',submitted.status()===200);
    const active=await submitted.json();
    check('review attached to submitted snapshot',active.status==='in_review'&&active.current===true&&!!active.requestId);
    const selfDecision=await context.request.post(review,{headers:{Origin:appOrigin},data:{...request,action:'approve',requestId:active.requestId,fingerprint:active.fingerprint,commandId:randomUUID()}});
    check('freelancer cannot approve own review',selfDecision.status()===404||selfDecision.status()===403);
    const requestByline=await context.request.post(appOrigin+'/api/newsroom/onboarding',{headers:{Origin:appOrigin},data:{expectedRevision:1,displayName:'CT15 freelancer',locale:'en',bylineRequested:true,acknowledgedVersion:1,confirmed:true}});
    check('freelancer submits actual private byline request',requestByline.status()===200&&(await requestByline.json()).profile.bylineRequested===true);
    const privateMedia=appOrigin+'/api/media/drafts';
    const uploadPrivate=async name=>context.request.post(privateMedia,{headers:{Origin:appOrigin},multipart:{file:{name,mimeType:'image/png',buffer:bytes}}});
    const uploadOne=await uploadPrivate('ct15-approved.png');
    check('freelancer uploads private media through actual HTTP route (HTTP '+uploadOne.status()+')',uploadOne.status()===201);
    mediaDraftId=(await uploadOne.json()).draft.id;
    const uploadTwo=await uploadPrivate('ct15-rejected.png');
    check('freelancer uploads second private review fixture',uploadTwo.status()===201);
    rejectedMediaDraftId=(await uploadTwo.json()).draft.id;
    const ownMedia=await context.request.get(privateMedia);
    check('freelancer list contains own pending media without private paths',ownMedia.status()===200);
    const ownMediaJson=await ownMedia.json();
    check('private media list is sanitized',ownMediaJson.drafts.some(r=>r.id===mediaDraftId&&r.state==='pending')&&!JSON.stringify(ownMediaJson).includes('storage_path')&&!JSON.stringify(ownMediaJson).includes('signedUrl'));
    const preview=await context.request.get(privateMedia+'/'+mediaDraftId+'/preview');
    check('freelancer receives short-lived own private preview',preview.status()===200&&(await preview.json()).expiresInSeconds===60);
    const cannotApprove=await context.request.post(privateMedia+'/'+mediaDraftId+'/approve',{headers:{Origin:appOrigin},data:{confirmRights:true,rightsStatus:'owned',rightsNotes:'CT15 synthetic fixture only'}});
    check('freelancer cannot approve own media',cannotApprove.status()===403);
    const revisionUrl=appOrigin+'/api/newsroom/contributor/stories/'+storyIds.public+'/revision';
    const revisionRead=await context.request.get(revisionUrl);
    check('assigned freelancer reads unpublished revision',revisionRead.status()===200);
    const rev=await revisionRead.json();
    check('revision source differs from live headline',rev.revisionId!==null&&rev.headline==='CT15 unpublished revision');
    const revisionCommand={action:'save',expectedUpdatedAt:rev.updatedAt,liveUpdatedAt:rev.liveUpdatedAt,revisionId:rev.revisionId,copy:{headline:'CT15 reviewed public revision',subheadline:rev.subheadline,summary:rev.summary,body:rev.body}};
    const revised=await context.request.put(revisionUrl,{headers:{Origin:appOrigin},data:revisionCommand});
    check('freelancer saves assigned revision (HTTP '+revised.status()+')',revised.status()===200&&(await revised.json()).headline===revisionCommand.copy.headline);
    const outdated=await context.request.put(revisionUrl,{headers:{Origin:appOrigin},data:revisionCommand});
    check('stale revision update rejected',outdated.status()===409);
    const unchanged=await anonymous.from('stories').select('headline').eq('id',storyIds.public).single();
    check('revision save leaves public article unchanged',!unchanged.error&&unchanged.data.headline==='CT15 public story');
    const revisionReview=appOrigin+'/api/newsroom/stories/'+storyIds.public+'/review';
    const revisionSnapshot=await context.request.get(revisionReview+'?kind=revision');
    check('assigned revision review state available',revisionSnapshot.status()===200);
    const revisionToken=await revisionSnapshot.json();
    const submittedRevision=await context.request.post(revisionReview,{headers:{Origin:appOrigin},data:{kind:'revision',action:'request',fingerprint:revisionToken.fingerprint,requestId:null,note:'CT15 saved revision ready for review',commandId:randomUUID()}});
    check('freelancer submits revised copy for independent review',submittedRevision.status()===200&&(await submittedRevision.json()).status==='in_review');
    const deniedPublish=await context.request.post(appOrigin+'/api/newsroom/stories/'+storyIds.assigned+'/publish-reviewed',{headers:{Origin:appOrigin},data:{kind:'draft',requestId:active.requestId,fingerprint:active.fingerprint}});
    check('freelancer cannot publish reviewed copy',deniedPublish.status()===403);

   }
   if(role==='editor'){
    const review=appOrigin+'/api/newsroom/stories/'+storyIds.assigned+'/review';
    const read=await context.request.get(review+'?kind=draft');
    check('editor can read submitted review (HTTP '+read.status()+')',read.status()===200);
    const current=await read.json();
    check('editor independent decision available',current.canDecide===true&&current.current===true&&current.status==='in_review');
    const decision={kind:'draft',action:'approve',fingerprint:current.fingerprint,requestId:current.requestId,note:'CT15 independent reviewer approved saved copy',commandId:randomUUID()};
    const result=await context.request.post(review,{headers:{Origin:appOrigin},data:decision});
    check('editor independent approval (HTTP '+result.status()+')',result.status()===200&&(await result.json()).decision==='approved');
    const duplicate=await context.request.post(review,{headers:{Origin:appOrigin},data:{...decision,commandId:randomUUID()}});
    check('second decision denied (HTTP '+duplicate.status()+')',duplicate.status()===409);
    const publicRead=await anonymous.from('stories').select('id').eq('id',storyIds.assigned);
    check('approval does not publish draft',!publicRead.error&&publicRead.data.length===0);
    approvedDraft=await (await context.request.get(review+'?kind=draft')).json();
    check('approved draft has current review token',approvedDraft.current&&approvedDraft.decision==='approved');
    const revisionReview=appOrigin+'/api/newsroom/stories/'+storyIds.public+'/review';
    const revisionRead=await context.request.get(revisionReview+'?kind=revision');
    check('editor can read submitted revision review',revisionRead.status()===200);
    const revisionState=await revisionRead.json();
    check('independent revision review is actionable',revisionState.current&&revisionState.canDecide);
    const revisionApproval=await context.request.post(revisionReview,{headers:{Origin:appOrigin},data:{kind:'revision',action:'approve',fingerprint:revisionState.fingerprint,requestId:revisionState.requestId,note:'CT15 independently approved revised copy',commandId:randomUUID()}});
    check('editor approves revision independently',revisionApproval.status()===200&&(await revisionApproval.json()).decision==='approved');
    approvedRevision=await (await context.request.get(revisionReview+'?kind=revision')).json();
    assert.ok(mediaDraftId&&rejectedMediaDraftId);
    const media=appOrigin+'/api/media/drafts';
    const mediaPost=(path,data,origin=appOrigin)=>context.request.post(media+'/'+path,{headers:{Origin:origin},data});
    const rights={confirmRights:true,rightsStatus:'owned',rightsNotes:'CT15 disposable image created for integration',altText:'Synthetic test image'};
    check('media approval denies hostile origin',(await mediaPost(mediaDraftId+'/approve',rights,'https://untrusted.example.test')).status()===403);
    check('media rejection denies hostile origin',(await mediaPost(rejectedMediaDraftId+'/reject',{reason:'CT15 synthetic rejection'},'https://untrusted.example.test')).status()===403);
    const approveMedia=await mediaPost(mediaDraftId+'/approve',rights);
    check('editor approves private media via actual API (HTTP '+approveMedia.status()+')',approveMedia.status()===200);
    const approvedMedia=await approveMedia.json();
    check('approved media promotion records catalog identity',approvedMedia.state==='published'&&typeof approvedMedia.mediaId==='string');
    const publicAsset=await service.from('media_assets').select('id,status,storage_path,rights_status').eq('id',approvedMedia.mediaId).single();
    check('approved catalog has reviewed rights',!publicAsset.error&&publicAsset.data.status==='approved'&&publicAsset.data.rights_status==='owned');
    const publicBytes=await anonymous.storage.from('media').download(publicAsset.data.storage_path);
    check('promoted public bytes exactly match source',!publicBytes.error&&Buffer.compare(Buffer.from(await publicBytes.data.arrayBuffer()),bytes)===0);
    const replayMedia=await mediaPost(mediaDraftId+'/approve',rights);
    check('media promotion retry returns same catalog identity',replayMedia.status()===200&&(await replayMedia.json()).mediaId===approvedMedia.mediaId);
    const rejectMedia=await mediaPost(rejectedMediaDraftId+'/reject',{reason:'CT15 synthetic review rejection'});
    check('editor rejects second private media item',rejectMedia.status()===200&&(await rejectMedia.json()).state==='rejected');
    check('rejected media cannot be approved',(await mediaPost(rejectedMediaDraftId+'/approve',rights)).status()===409);

    const scheduleUrl=appOrigin+'/api/newsroom/stories/'+storyIds.assigned+'/schedule-reviewed';
    const pubUrl=appOrigin+'/api/newsroom/stories/'+storyIds.assigned+'/publish-reviewed';
    const postEditorial=(url,data)=>context.request.post(url,{headers:{Origin:appOrigin},data});
    const publishToken={kind:'draft',requestId:approvedDraft.requestId,fingerprint:approvedDraft.fingerprint};
    const schedule={...publishToken,action:'schedule',dueAt:new Date(Date.now()+3600000).toISOString()};
    check('past reviewed schedule rejected',(await postEditorial(scheduleUrl,{...schedule,dueAt:new Date(Date.now()-3600000).toISOString()})).status()===422);
    const queued=await postEditorial(scheduleUrl,schedule);
    check('editor schedules approved draft (HTTP '+queued.status()+')',queued.status()===200);
    const queueState=await queued.json();
    check('reviewed schedule pending and current',queueState.state==='pending'&&queueState.current===true);
    check('active schedule prevents immediate publish',(await postEditorial(pubUrl,publishToken)).status()===409);
    check('duplicate schedule rejected',(await postEditorial(scheduleUrl,schedule)).status()===409);
    const queueRead=await context.request.get(scheduleUrl+'?kind=draft');
    check('schedule remains visible after reload',queueRead.status()===200&&(await queueRead.json()).id===queueState.id);
    const calendar=appOrigin+'/api/newsroom/calendar?'+new URLSearchParams({start:new Date(Date.now()-86400000).toISOString(),end:new Date(Date.now()+86400000).toISOString(),filter:'publications'});
    const calendarResponse=await context.request.get(calendar);
    check('calendar reflects actual scheduled publication',calendarResponse.status()===200&&(await calendarResponse.json()).items.some(a=>a.id===queueState.id&&a.kind==='publication'&&a.snapshotCurrent));
    const cancelled=await postEditorial(scheduleUrl,{action:'cancel',kind:'draft',scheduleId:queueState.id});
    check('editor cancels reviewed schedule',cancelled.status()===200&&(await cancelled.json()).state==='cancelled');
    const cleared=await context.request.get(scheduleUrl+'?kind=draft');
    check('cancelled schedule no longer active',cleared.status()===200&&(await cleared.json())===null);

   }
   if(role==='moderator'){
    await page.goto(appOrigin+'/newsroom/comments',{waitUntil:'domcontentloaded',timeout:20000});
    await page.getByRole('heading',{name:'Comments',exact:true}).waitFor({state:'visible'});
    check('moderator comment workspace available',true);
    await page.goto(appOrigin+'/newsroom/reports',{waitUntil:'domcontentloaded',timeout:20000});
    await page.getByRole('heading',{name:'Reports',exact:true}).waitFor({state:'visible'});
    check('moderator reports workspace available',true);
    const moderation=appOrigin+'/api/newsroom/comments',reports=moderation+'/reports';
    assert.ok(submittedCommentId&&submittedReportId,'reader scenario must have created comment and report');
    const modPost=(url,data)=>context.request.post(url,{headers:{Origin:appOrigin},data});
    const queue=await context.request.get(moderation+'?status=pending&storyId='+storyIds.public);
    check('moderator queue includes submitted pending comment',queue.status()===200&&(await queue.json()).items.some(c=>c.id===submittedCommentId&&c.canModerate));
    const detail=await context.request.get(moderation+'?commentId='+submittedCommentId);
    check('moderator actual comment detail',detail.status()===200);
    const pending=(await detail.json()).comment;
    const approve={commentId:submittedCommentId,revision:pending.revision,action:'approve',reason:'CT15 independent moderator approval',commandId:randomUUID()};
    const approved=await modPost(moderation,approve);
    check('moderator approves reader comment (HTTP '+approved.status()+')',approved.status()===200);
    const approvedDetail=await approved.json();
    check('approval records attributed audit event',approvedDetail.comment.status==='published'&&approvedDetail.history.some(e=>e.action==='approve'&&e.byMe===true));
    const publicComments=appOrigin+'/api/stories/'+storyIds.public+'/comments';
    const thread=await context.request.get(publicComments);
    check('approved reader comment appears in public thread',thread.status()===200&&(await thread.json()).comments.some(c=>c.id===submittedCommentId));
    const reportQueue=await context.request.get(reports+'?status=open&storyId='+storyIds.public);
    check('moderator queue includes reader report',reportQueue.status()===200&&(await reportQueue.json()).items.some(r=>r.id===submittedReportId&&r.canResolve));
    const reportDetail=await context.request.get(reports+'?reportId='+submittedReportId);
    check('moderator actual report detail',reportDetail.status()===200);
    const open=(await reportDetail.json()).report;
    check('staff report projection excludes reporter identity',!('reporterId' in open)&&!('reviewedBy' in open));
    const reviewed=await modPost(reports,{reportId:submittedReportId,revision:open.revision,commentRevision:open.commentRevision,target:'reviewed',reason:'CT15 moderator investigating report',actionEventId:null,commandId:randomUUID()});
    check('moderator reviews report (HTTP '+reviewed.status()+')',reviewed.status()===200);
    const reviewState=(await reviewed.json()).report;
    check('report enters reviewed state',reviewState.status==='reviewed');
    const hidden=await modPost(moderation,{commentId:reportTargetId,revision:reviewState.commentRevision,action:'hide',reason:'CT15 audited hide of reported comment',commandId:randomUUID()});
    check('moderator hides reported comment (HTTP '+hidden.status()+')',hidden.status()===200);
    const hiddenDetail=await hidden.json();
    const event=hiddenDetail.history.find(e=>e.action==='hide'&&e.byMe===true);
    check('hide creates attributed moderation audit',hiddenDetail.comment.status==='hidden'&&!!event);
    const command={reportId:submittedReportId,revision:reviewState.revision,commentRevision:hiddenDetail.comment.revision,target:'actioned',reason:'CT15 report resolved by verified hide',actionEventId:event.id,commandId:randomUUID()};
    check('stale report resolution denied',(await modPost(reports,{...command,commentRevision:reviewState.commentRevision,commandId:randomUUID()})).status()===409);
    const resolvedReport=await modPost(reports,command);
    check('moderator resolves report with audited action (HTTP '+resolvedReport.status()+')',resolvedReport.status()===200);
    const resolution=await resolvedReport.json();
    check('resolution links exact hide event',resolution.report.status==='actioned'&&resolution.report.actionEventId===event.id&&resolution.history.some(e=>e.actionEventId===event.id&&e.byMe));
    const finalThread=await context.request.get(publicComments);
    const finalComments=(await finalThread.json()).comments;
    check('hidden target removed from public thread without removing approved comment',finalThread.status()===200&&!finalComments.some(c=>c.id===reportTargetId)&&finalComments.some(c=>c.id===submittedCommentId));
    const finalOwn=await reader.rpc('reader_list_own_reports',{p_page:0});
    check('reporter real JWT sees final actioned status',!finalOwn.error&&finalOwn.data.items.some(r=>r.id===submittedReportId&&r.status==='actioned'));
    const otherOwn=await legacyUser.rpc('reader_list_own_reports',{p_page:0});
    check('other reader cannot see report receipt',!otherOwn.error&&!otherOwn.data.items.some(r=>r.id===submittedReportId));
   }
   if(role==='reader'){
    await page.goto(appOrigin+'/account/profile',{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('#account-main').waitFor({state:'visible'});
    check('reader profile page accessible',new URL(page.url()).pathname==='/account/profile');
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:resolve(output,'reader-profile-mobile.png'),fullPage:true,timeout:10000,animations:'disabled'});
   }
   if(!['reader','legacy'].includes(role)){
    const landing=['owner','editor'].includes(role)?'/newsroom/stories':'/newsroom/contributor';
    for(const width of [390,768]){
     await page.setViewportSize({width,height:844});
     await page.goto(appOrigin+landing,{waitUntil:'load',timeout:20000});
     await page.locator('#newsroom-main').waitFor({state:'visible'});
     const metrics=await page.evaluate(()=>{
       const main=document.getElementById('newsroom-main'),nav=document.querySelector('aside nav');
       return {width:window.innerWidth,root:document.documentElement.scrollWidth,mainWidth:main?.clientWidth,mainScroll:main?.scrollWidth,navWidth:nav?.clientWidth,navScroll:nav?.scrollWidth,active:nav?.querySelectorAll('[aria-current=page]').length};
     });
     check(role+' '+width+'px responsive shell and scoped nav',metrics.root<=width+1&&metrics.mainWidth>=width-2&&metrics.mainScroll<=metrics.mainWidth+1&&metrics.navWidth<=width&&metrics.active===1);
     await page.locator('a[href="#newsroom-main"]').focus();
     await page.keyboard.press('Enter');
     check(role+' '+width+'px keyboard skip link focuses content',await page.locator('#newsroom-main').evaluate(el=>document.activeElement===el));
     await page.screenshot({path:resolve(output,role+'-'+width+'-responsive.png'),fullPage:true,timeout:10000,animations:'disabled'});
     if(role==='owner'&&width===390){
      const sort=page.getByRole('combobox',{name:'Sort by',exact:true});
      check('story sort options have visible labels',await sort.locator('option').evaluateAll(options=>options.length===4&&options.every(o=>!!o.textContent?.trim())));
      await sort.selectOption('headline_asc');
      await page.waitForURL(url=>url.searchParams.get('sort')==='headline_asc');
      await page.locator('tbody tr').first().getByRole('link',{name:'CT15 assigned story',exact:true}).waitFor({state:'visible'});
      check('mobile story sort changes actual ordering',true);
      await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('published');
      await page.waitForURL(url=>url.searchParams.get('status')==='published');
      await page.locator('tbody tr').first().getByRole('link',{name:'CT15 premium story',exact:true}).waitFor({state:'visible'});
      check('mobile status filter returns published stories only',await page.locator('tbody tr').count()===3);
      await page.getByRole('button',{name:'Clear filters',exact:true}).click();
      await page.waitForURL(url=>url.pathname==='/newsroom/stories'&&!url.search);
      await page.getByRole('link',{name:'CT15 assigned story',exact:true}).waitFor({state:'visible'});
      check('mobile clear filters restores full list',await page.locator('tbody tr').count()===5);
      await page.goto(appOrigin+'/newsroom/team',{waitUntil:'load',timeout:20000});
      const nav=page.locator('aside nav');
      await page.waitForFunction(()=>{const n=document.querySelector('aside nav'),a=n?.querySelector('[aria-current=page]');if(!n||!a)return false;const b=n.getBoundingClientRect(),r=a.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;});
      check('mobile active team tab scrolls into view',await nav.locator('[aria-current=page]').count()===1);
      await page.screenshot({path:resolve(output,'owner-390-team-active.png'),fullPage:true,timeout:10000,animations:'disabled'});
     }
    }
    await page.setViewportSize({width:1440,height:900});
   }
   // Page-level audit is independent of individual route failures, but all
   // failed assertions remain release-visible. No mutation through audited pages.
   const audits=role==='owner'?['/newsroom','/newsroom/team','/newsroom/media','/newsroom/authors','/newsroom/page-editor','/newsroom/comments','/newsroom/reports','/newsroom/reviews','/newsroom/schedule','/newsroom/polls','/newsroom/profile','/newsroom/privacy']:
     role==='reader'?['/account','/account/saved','/account/comments','/account/reports','/account/notifications','/account/newsletters','/account/subscription','/account/profile','/account/security']:[];
   for(const path of audits)for(const width of [390,1440]){
    const key=path.split('/').filter(Boolean).join('-')+'-'+width;
    try{
     await page.setViewportSize({width,height:900});
     const errors=[];const onError=e=>errors.push(redact(e.message).slice(0,200));page.on('pageerror',onError);
     let metrics;
     try{
      const response=await page.goto(appOrigin+path,{waitUntil:'load',timeout:25000});
      const main=page.locator(role==='owner'?'#newsroom-main':'#account-main');
      await main.waitFor({state:'visible',timeout:10000});
      if(path==='/newsroom/team'){
       await page.locator('#ct-team-directory[aria-busy="false"]').waitFor({timeout:15000});
       await page.getByRole('region',{name:'Team members',exact:true}).waitFor({state:'visible',timeout:5000});
       check('owner settled team directory '+width+'px',await page.locator('#ct-team-directory section[aria-label="Team members"] li button').count()===5);
      }
      if(path==='/newsroom/media'){
       await page.locator('#ct-media-library[aria-busy="false"]').waitFor({timeout:15000});
       check('owner settled media library '+width+'px',await page.locator('#ct-media-library [role=alert]').count()===0);
      }
      await page.waitForFunction(()=>document.documentElement.lang===document.querySelector('[lang]:not(html)')?.getAttribute('lang'),{},{timeout:5000}).catch(()=>{});
      metrics=await page.evaluate(()=>{
       const m=document.querySelector('main');
       const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
       return {root:document.documentElement.scrollWidth,viewport:innerWidth,main:m?.clientWidth,scroll:m?.scrollWidth,mains:document.querySelectorAll('main').length,headings:[...document.querySelectorAll('h1')].filter(visible).length,mainHeadings:[...(m?.querySelectorAll('h1')??[])].filter(visible).length,lang:document.documentElement.lang,alerts:[...(m?.querySelectorAll('[role=alert]')??[])].filter(visible).map(a=>a.textContent?.slice(0,160))};
      });
      const ok=response?.status()===200&&new URL(page.url()).pathname===path&&metrics.root<=width+1&&metrics.scroll<=metrics.main+1&&metrics.mains===1&&metrics.headings===1&&metrics.mainHeadings===1&&metrics.lang===(role==='reader'?'es':'en')&&errors.length===0&&metrics.alerts.length===0;
      report.pageAudits??=[];report.pageAudits.push({role,path,width,status:response?.status(),metrics,errors,ok});checkpoint();
      await page.screenshot({path:resolve(output,key+'-audit.png'),fullPage:true,timeout:10000,animations:'disabled'});
      check(role+' page audit '+path+' '+width+'px',ok);
      if(path==='/newsroom/team'&&width===390){
       const tabs=page.locator('[data-team-tab]');
       check('team starts in members tab',await page.locator('[data-team-tab="members"]').getAttribute('aria-pressed')==='true'&&await page.locator('#ct-team-members').isVisible());
       check('all five owner team sections reachable',await tabs.count()===5);
       for(const key of ['invitations','bylines','presets','audit','members']){
        const tab=page.locator('[data-team-tab="'+key+'"]');await tab.focus();await page.keyboard.press('Enter');
        check('team tab '+key+' opens by keyboard',await tab.getAttribute('aria-pressed')==='true'&&await page.locator('#ct-team-'+key).isVisible());
        check('team tab '+key+' exclusive panel',await page.locator('[id^="ct-team-"]').evaluateAll((els,k)=>els.filter(e=>['ct-team-members','ct-team-invitations','ct-team-bylines','ct-team-presets','ct-team-audit'].includes(e.id)&&!e.hidden).map(e=>e.id).join(',')==='ct-team-'+k,key));
       }
      }
      if(path==='/newsroom/page-editor'&&width===390){
       const sections=page.locator('details[data-front-page-section]');
       check('all six homepage sections initially compact',await sections.count()===6&&await sections.evaluateAll(els=>els.every(el=>!el.open)));
       const main=page.locator('#newsroom-main');
       const compactHeight=await main.evaluate(el=>el.scrollHeight);
       check('collapsed page editor is under 2500 CSS pixels',compactHeight<2500);
       const section=sections.first(),summary=section.locator('summary');
       await summary.focus();await page.keyboard.press('Enter');
       check('homepage section opens with keyboard',await section.evaluate(el=>el.open));
       check('opening section exposes actual placement controls',await section.getByRole('button',{name:/assign story/i}).first().isVisible());
       await summary.focus();await page.keyboard.press('Space');
       check('homepage section collapses and preserves compact layout',!(await section.evaluate(el=>el.open))&&await main.evaluate(el=>el.scrollHeight)<=compactHeight+2);
       const actions=page.getByRole('button',{name:'Actions',exact:true});
       await actions.click();await page.keyboard.press('Escape');
       check('page editor actions Escape restores focus',await actions.getAttribute('aria-expanded')==='false'&&await actions.evaluate(el=>document.activeElement===el));
       await actions.click();await page.getByRole('button',{name:'Layout History',exact:true}).click();
       const dialog=page.getByRole('dialog',{name:'Layout History'});
       await dialog.waitFor({state:'visible'});
       check('history uses accessible modal and focuses inside',await dialog.evaluate(el=>el.contains(document.activeElement)));
       await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
       // Radix FocusScope schedules unmount autofocus on the next task.
       // Wait for actual restored focus, not merely hidden dialog.
       await page.waitForFunction(()=>document.activeElement?.id==='page-editor-actions',undefined,{timeout:3000});
       check('history Escape returns focus to Actions',await actions.evaluate(el=>document.activeElement===el));
       await actions.click();await page.getByRole('button',{name:'Layout History',exact:true}).click();
       await dialog.waitFor({state:'visible'});
       await page.keyboard.press('Tab');
       check('history traps forward keyboard focus',await dialog.evaluate(el=>el.contains(document.activeElement)));
       await page.keyboard.press('Shift+Tab');
       check('history traps reverse keyboard focus',await dialog.evaluate(el=>el.contains(document.activeElement)));
       await dialog.getByRole('button',{name:'Close',exact:true}).click();
       await dialog.waitFor({state:'hidden'});
       await page.waitForFunction(()=>document.activeElement?.id==='page-editor-actions',undefined,{timeout:3000});
       check('history Close restores trigger focus',true);
       await page.screenshot({path:resolve(output,'newsroom-page-editor-390-compact.png'),fullPage:true,timeout:10000,animations:'disabled'});
      }
      if(path==='/newsroom/schedule'&&width===390){
       const month=page.getByRole('region',{name:'Monthly calendar',exact:true});
       await month.focus();check('monthly calendar scroll region keyboard focusable',await month.evaluate(el=>document.activeElement===el));
       await page.getByRole('navigation',{name:'Calendar view',exact:true}).getByRole('link',{name:'Agenda',exact:true}).click();
       await page.waitForURL(url=>url.searchParams.get('view')==='agenda');
       check('mobile calendar agenda switch keeps same calendar route',new URL(page.url()).pathname===path&&await month.count()===0);
       await page.screenshot({path:resolve(output,'newsroom-schedule-390-agenda.png'),fullPage:true,timeout:10000,animations:'disabled'});
      }
     }finally{page.off('pageerror',onError);}
    }catch(e){
     const error=redact(e instanceof Error?e.message:String(e)).slice(0,500);
     report.roleErrors.push({role,path,width,error});console.log('PAGE AUDIT FAILURE '+key+' '+error);checkpoint();
    }
   }
   await page.setViewportSize({width:1440,height:900});
   if(role==='reader'){
    await page.goto(appOrigin+'/es',{waitUntil:'load',timeout:20000});
    const account=page.locator('header').getByRole('button',{name:/cuenta/i}).first();
    await account.click();
    check('reader account menu reports expanded state',await account.getAttribute('aria-expanded')==='true');
    await page.keyboard.press('Escape');
    check('reader account menu Escape restores focus',await account.getAttribute('aria-expanded')==='false'&&await account.evaluate(el=>document.activeElement===el));
    await account.press('Enter');
    check('reader keyboard opens account disclosure',await account.getAttribute('aria-expanded')==='true');
    const signOut=page.locator('header').getByRole('button',{name:/cerrar sesi[oó]n/i}).first();
    const [logout]=await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).origin===apiOrigin&&new URL(r.url()).pathname==='/auth/v1/logout'&&r.request().method()==='POST',{timeout:15000}),
      signOut.click()
    ]);
    check('reader public menu real Auth logout succeeds',logout.ok());
    await page.waitForURL(url=>url.pathname==='/es',{timeout:15000});
    const after=await context.request.get(appOrigin+'/api/account/profile');
    check('reader public logout clears session',after.status()===403);
   }
   if(role==='owner'){
    await page.goto(appOrigin+'/newsroom',{waitUntil:'load',timeout:20000});
    const signOut=page.locator('header').getByRole('button',{name:/sign out|log out/i}).first();
    const [logout]=await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).origin===apiOrigin&&new URL(r.url()).pathname==='/auth/v1/logout'&&r.request().method()==='POST',{timeout:15000}),
      signOut.click()
    ]);
    check('owner real Auth logout request successful (HTTP '+logout.status()+')',logout.ok());
    await page.waitForURL(url=>['/','/en','/es'].includes(url.pathname),{timeout:15000});
    const after=await context.request.get(appOrigin+'/api/account/profile');
    check('owner cookie profile API denied after logout (HTTP '+after.status()+')',after.status()===403);
    await page.goto(appOrigin+'/account',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForURL(url=>url.pathname.endsWith('/auth/sign-in'),{timeout:15000});
    check('owner actual sign-out invalidates browser session',true);
   }
   check(role+' no uncaught browser errors',runtime.length===0);
  }catch(e){
   const error=redact(e instanceof Error?e.message:String(e)).slice(0,700);
   report.roleErrors.push({role,error});console.log('ROLE FAILURE '+role+' '+error);checkpoint();
   // Synthetic page only; avoid login screenshots (password fields), traces,
   // cookies, request bodies or session credentials.
   if(page&&!page.isClosed()&&new URL(page.url()).origin===appOrigin&&!new URL(page.url()).pathname.includes('/auth/')){
    await page.screenshot({path:resolve(output,role+'-failure.png'),fullPage:true,timeout:5000,animations:'disabled'}).catch(()=>{});
    const diagnostic=await page.locator('main').evaluate(el=>({heading:el.querySelector('h1')?.textContent??null,alerts:[...el.querySelectorAll('[role=alert]')].map(a=>a.textContent),buttons:[...el.querySelectorAll('button[type=submit]')].map(b=>({label:b.textContent,disabled:b.disabled}))})).catch(()=>null);
    if(diagnostic)console.log('ROLE DIAGNOSTIC '+role+' '+redact(JSON.stringify(diagnostic)).slice(0,1000));
   }
   // Keep independent roles running; the overall workflow still fails.
  }finally{await context.close();}
 }
 assert.equal(report.roleErrors.length,0,'One or more authenticated role scenarios failed; inspect roleErrors');
 // Publish only after all earlier reader/draft isolation assertions finish.
 // No cron, provider dispatch or hosted write; a fresh real editor session.
 mark('isolated final editorial publication');
 const publicationContext=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 try{
  await publicationContext.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();
   if(url.origin===appOrigin&&['GET','HEAD'].includes(method))return route.continue();
   if(url.origin===apiOrigin&&(method==='OPTIONS'||(['GET','HEAD'].includes(method)&&url.pathname.startsWith('/auth/v1/'))||method==='POST'&&url.pathname==='/auth/v1/token'))return route.continue();
   return route.abort();
  });
  const publicationPage=await publicationContext.newPage();
  await publicationPage.goto(appOrigin+'/en/auth/sign-in?next=%2Faccount',{waitUntil:'load',timeout:20000});
  await publicationPage.locator('#email').fill(users.editor.email);await publicationPage.locator('#password').fill(password);
  await publicationPage.locator('form button[type="submit"]').click();
  await publicationPage.waitForURL(url=>url.pathname==='/account',{timeout:20000});
  check('fresh editor cookie session for publication',true);
  const post=(id,data)=>publicationContext.request.post(appOrigin+'/api/newsroom/stories/'+id+'/publish-reviewed',{headers:{Origin:appOrigin},data});
  const before=await anonymous.from('stories').select('headline,published_at').eq('id',storyIds.public).single();
  check('original public headline preserved until publication',!before.error&&before.data.headline==='CT15 public story');
  const draftToken={kind:'draft',requestId:approvedDraft.requestId,fingerprint:approvedDraft.fingerprint};
  const revisionToken={kind:'revision',requestId:approvedRevision.requestId,fingerprint:approvedRevision.fingerprint};
  check('incorrect publication fingerprint rejected',(await post(storyIds.assigned,{...draftToken,fingerprint:'0'.repeat(64)})).status()===409);
  const published=await post(storyIds.assigned,draftToken);
  check('approved draft actually publishes (HTTP '+published.status()+')',published.status()===200&&(await published.json()).status==='published');
  const visible=await anonymous.from('stories').select('headline,status').eq('id',storyIds.assigned).single();
  check('published draft now visible to public REST',!visible.error&&visible.data.status==='published'&&visible.data.headline==='CT15 assigned story edited');
  const repeated=await post(storyIds.assigned,draftToken);
  check('repeat publication cannot publish twice',repeated.status()===409);
  const revisionPublished=await post(storyIds.public,revisionToken);
  check('approved revision actually publishes (HTTP '+revisionPublished.status()+')',revisionPublished.status()===200&&(await revisionPublished.json()).status==='published');
  const after=await anonymous.from('stories').select('headline,published_at').eq('id',storyIds.public).single();
  check('published revision updates headline but preserves original publication timestamp',!after.error&&after.data.headline==='CT15 reviewed public revision'&&after.data.published_at===before.data.published_at);
  const history=await service.from('story_versions').select('story_id,headline').in('story_id',[storyIds.public,storyIds.assigned]);
  check('publication versions retain prior live copy and initial draft',!history.error&&history.data.some(v=>v.story_id===storyIds.public&&v.headline==='CT15 public story')&&history.data.some(v=>v.story_id===storyIds.assigned&&v.headline==='CT15 assigned story edited'));
  check('published revision consumed and exact publication audit recorded',sql('publication audit',['-At','-f','-'],"select ((select count(*) from newsroom_private.publication_events where story_id in ("+uuid(storyIds.public)+","+uuid(storyIds.assigned)+"))=2 and not exists(select 1 from public.story_revisions where story_id="+uuid(storyIds.public)+") and not exists(select 1 from newsroom_private.publication_permits))::text")==='true');
  await publicationPage.goto(appOrigin+'/en/article/ct15-public',{waitUntil:'load',timeout:20000});
  await publicationPage.getByRole('heading',{name:'CT15 reviewed public revision',exact:true}).waitFor({state:'visible'});
  check('real public article displays reviewed headline',true);
  await publicationPage.screenshot({path:resolve(output,'published-revision-article.png'),fullPage:true,timeout:10000,animations:'disabled'});
 }finally{await publicationContext.close();}
 // Fresh owner session and new verified invitee after all original role checks.
 // No real address, external mail, or persistent credentials in artifacts.
 async function adminTestContext(email){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  try{
   await ctx.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.origin===appOrigin&&['GET','HEAD'].includes(method))return route.continue();
    if(url.origin===apiOrigin&&(method==='OPTIONS'||(['GET','HEAD'].includes(method)&&url.pathname.startsWith('/auth/v1/'))||method==='POST'&&url.pathname==='/auth/v1/token'))return route.continue();
    return route.abort();
   });
   const pg=await ctx.newPage();
   await pg.goto(appOrigin+'/en/auth/sign-in?next=%2Faccount',{waitUntil:'load',timeout:20000});
   await pg.locator('#email').fill(email);await pg.locator('#password').fill(password);
   await pg.locator('form button[type="submit"]').click();
   await pg.waitForURL(url=>url.pathname==='/account',{timeout:20000});
   return ctx;
  }catch(e){await ctx.close();throw e;}
 }
 mark('isolated invitation redemption and byline review');
 const inviteeEmail='ct15-redeem@example.test';
 const invitee=await service.auth.admin.createUser({email:inviteeEmail,password,email_confirm:true});
 check('new disposable verified invitee created',!invitee.error&&!!invitee.data.user?.id);
 const inviteeContext=await adminTestContext(inviteeEmail);
 try{
  const endpoint=appOrigin+'/api/newsroom/team/invitations';
  const redeem=()=>inviteeContext.request.post(endpoint,{headers:{Origin:appOrigin},data:{action:'redeem',token:redemptionCode}});
  const accepted=await redeem();
  check('verified matching account redeems invitation (HTTP '+accepted.status()+')',accepted.status()===200&&(await accepted.json()).ok===true);
  check('invitation cannot be redeemed twice',(await redeem()).status()===403);
  const access=await inviteeContext.request.get(appOrigin+'/api/newsroom/onboarding');
  check('new member receives moderator onboarding only',access.status()===200&&(await access.json()).roles.some(r=>r.key==='moderator'));
  check('new moderator denied team management',(await inviteeContext.request.get(appOrigin+'/api/newsroom/team')).status()===404);
 }finally{await inviteeContext.close();}
 const ownerContext=await adminTestContext(users.owner.email);
 let pollState;
 try{
  const byline=appOrigin+'/api/newsroom/team/bylines';
  const pending=await ownerContext.request.get(byline);
  check('owner loads private byline review queue',pending.status()===200);
  const target=(await pending.json()).items.find(r=>r.display_name==='CT15 freelancer'&&r.requested);
  check('freelancer request appears in owner review queue',target?.review_status==='pending'&&target.eligible===true);
  const command={membershipId:target.membership_id,profileRevision:target.profile_revision,reviewRevision:target.review_revision,action:'reject',bylineId:null,reason:'CT15 synthetic byline request requires correction',confirmed:true};
  const rejected=await ownerContext.request.post(byline,{headers:{Origin:appOrigin},data:command});
  check('owner records reviewed byline rejection',rejected.status()===200&&(await rejected.json()).revision===target.review_revision+1);
  check('stale byline review rejected',(await ownerContext.request.post(byline,{headers:{Origin:appOrigin},data:command})).status()===409);
  const updated=await ownerContext.request.get(byline);
  check('byline decision appears in queue',updated.status()===200&&(await updated.json()).items.some(r=>r.membership_id===target.membership_id&&r.review_status==='rejected'));
  // Fixture editorial identities only; the review API must not rewrite
  // public author records or historical story attribution.
  const availableByline=randomUUID(),historicalByline=randomUUID();
  sql('synthetic editorial identities',['-f','-'],"insert into public.editorial_profiles(id,account_id,byline_name,slug,byline_status) values("+uuid(availableByline)+",null,'CT15 available byline','ct15-available-byline','hidden'),("+uuid(historicalByline)+","+uuid(users.legacy.id)+",'CT15 historical author','ct15-historical-author','active');");
  const contributor=await adminTestContext(users.freelancer.email);
  try{
   const renewed=await contributor.request.post(appOrigin+'/api/newsroom/onboarding',{headers:{Origin:appOrigin},data:{expectedRevision:target.profile_revision,displayName:'CT15 freelancer',locale:'en',bylineRequested:true,acknowledgedVersion:1,confirmed:true}});
   check('contributor renews rejected byline request',renewed.status()===200&&(await renewed.json()).profile.revision===target.profile_revision+1);
   const newRequest=await ownerContext.request.get(byline);
   const renewedTarget=(await newRequest.json()).items.find(r=>r.membership_id===target.membership_id);
   check('renewed byline returns to pending',newRequest.status()===200&&renewedTarget.review_status==='pending');
   const candidates=await ownerContext.request.get(byline+'?member='+target.membership_id);
   const candidateRows=(await candidates.json()).items;
   check('byline candidates include eligible identity but exclude historical author',candidates.status()===200&&candidateRows.some(r=>r.id===availableByline)&&!candidateRows.some(r=>r.id===historicalByline));
   const approve={...command,profileRevision:renewedTarget.profile_revision,reviewRevision:renewedTarget.review_revision,action:'approve',bylineId:availableByline,reason:'CT15 reviewed synthetic editorial association'};
   const forbidden=await ownerContext.request.post(byline,{headers:{Origin:appOrigin},data:{...approve,bylineId:historicalByline}});
   check('historical byline cannot be claimed by another account',forbidden.status()===409);
   const accepted=await ownerContext.request.post(byline,{headers:{Origin:appOrigin},data:approve});
   check('owner approves renewed private byline association',accepted.status()===200&&(await accepted.json()).revision===approve.reviewRevision+1);
   const contributorPage=contributor.pages()[0];
   await contributorPage.goto(appOrigin+'/newsroom/profile',{waitUntil:'load',timeout:20000});
   await contributorPage.getByText('Approved association',{exact:true}).waitFor({state:'visible'});
   check('contributor profile shows approved private byline name',await contributorPage.getByText('CT15 available byline',{exact:true}).isVisible());
   await contributorPage.screenshot({path:resolve(output,'freelancer-byline-approved.png'),fullPage:true,timeout:10000,animations:'disabled'});
   const unlink=await ownerContext.request.post(byline,{headers:{Origin:appOrigin},data:{...approve,action:'unlink',bylineId:null,reviewRevision:approve.reviewRevision+1,reason:'CT15 remove synthetic private association'}});
   check('owner unlinks private association',unlink.status()===200&&(await unlink.json()).revision===approve.reviewRevision+2);
   await contributorPage.reload({waitUntil:'load',timeout:20000});
   await contributorPage.getByText('Association removed',{exact:true}).waitFor({state:'visible'});
   check('contributor profile confirms unlink without exposing former name',await contributorPage.getByText('CT15 available byline',{exact:true}).count()===0);
   check('public authorship and historical article attribution unchanged',sql('private association integrity',['-At','-f','-'],"select (exists(select 1 from public.editorial_profiles where id="+uuid(availableByline)+" and account_id is null and byline_status='hidden') and exists(select 1 from public.editorial_profiles where id="+uuid(historicalByline)+" and account_id="+uuid(users.legacy.id)+") and exists(select 1 from public.stories where id="+uuid(storyIds.public)+" and author_id="+uuid(users.legacy.id)+"))::text;")==='true');
  }finally{await contributor.close();}
  const privacy=appOrigin+'/api/newsroom/privacy';
  const queue=await ownerContext.request.get(privacy);
  check('owner privacy queue contains reader deletion request',queue.status()===200);
  const entry=(await queue.json()).items.find(r=>r.id===privacyRequestId);
  check('owner sees exact independently reviewable receipt',entry?.status==='pending'&&entry.canReview===true&&entry.email===users.reader.email);
  const privacyPost=data=>ownerContext.request.post(privacy,{headers:{Origin:appOrigin},data});
  const review={id:entry.id,expectedUpdatedAt:entry.updatedAt,action:'review',resolution:null};
  check('owner moves privacy request to review',(await privacyPost(review)).status()===200);
  check('stale privacy review denied',(await privacyPost(review)).status()===409);
  const current=(await (await ownerContext.request.get(privacy)).json()).items.find(r=>r.id===entry.id);
  check('reviewing receipt persists',current?.status==='reviewing');
  check('owner records non-destructive privacy decline',(await privacyPost({...review,expectedUpdatedAt:current.updatedAt,action:'decline',resolution:'retention_required'})).status()===200);
  const closed=await ownerContext.request.get(privacy);
  check('closed privacy request no longer in open queue',closed.status()===200&&!(await closed.json()).items.some(r=>r.id===entry.id));
  const team=await (await ownerContext.request.get(appOrigin+'/api/newsroom/team')).json();
  const editor=team.members.find(m=>m.roles.some(r=>r.roleKey==='editor'));
  assert.ok(editor);
  const overrideUrl=appOrigin+'/api/newsroom/team/override-change';
  const overridePost=data=>ownerContext.request.post(overrideUrl,{headers:{Origin:appOrigin},data});
  for(const capability of ['poll.view_manage','poll.publish']){
   const grant=await overridePost({targetMembershipId:editor.id,operation:'set',capability,scope:'all',effect:'allow',expiresAt:new Date(Date.now()+7200000).toISOString(),reason:'CT15 disposable independent poll reviewer'});
   check('temporary isolated editor grant '+capability,grant.status()===200);
  }
  const polls=appOrigin+'/api/newsroom/polls';
  const pollPost=data=>ownerContext.request.post(polls,{headers:{Origin:appOrigin},data});
  const copy={language:'en',question:'CT15 synthetic poll question?',options:['Option A','Option B'],opensAt:new Date(Date.now()-3600000).toISOString(),closesAt:new Date(Date.now()+86400000).toISOString(),cap:5};
  const created=await pollPost({action:'create',id:null,version:null,copy});
  check('owner creates poll via actual authenticated API (HTTP '+created.status()+')',created.status()===200);
  const draft=await created.json();
  check('new poll is draft version one',draft.status==='draft'&&draft.version===1);
  const submitted=await pollPost({action:'submit',id:draft.id,version:draft.version,copy:null});
  check('owner submits poll for review',submitted.status()===200);
  pollState=await submitted.json();
  check('poll cannot be approved by creator',(await pollPost({action:'approve',id:draft.id,version:pollState.version,copy:null})).status()===403);
  check('unapproved poll cannot publish',(await pollPost({action:'publish',id:draft.id,version:pollState.version,copy:null})).status()===409);
  check('stale poll edit rejected',(await pollPost({action:'save',id:draft.id,version:draft.version,copy})).status()===409);
 }finally{await ownerContext.close();}
 mark('isolated public poll lifecycle and reader communications');
 const pollEditor=await adminTestContext(users.editor.email);
 try{
  const pollPost=data=>pollEditor.request.post(appOrigin+'/api/newsroom/polls',{headers:{Origin:appOrigin},data});
  const approved=await pollPost({action:'approve',id:pollState.id,version:pollState.version,copy:null});
  check('independent editor approves poll',approved.status()===200);
  pollState=await approved.json();
  const published=await pollPost({action:'publish',id:pollState.id,version:pollState.version,copy:null});
  check('independently approved poll publishes',published.status()===200);
  pollState=await published.json();
  const hidden=await anonymous.rpc('public_list_polls',{p_language:'en',p_page:0});
  check('published poll remains hidden until database activation',!hidden.error&&hidden.data.enabled===false&&hidden.data.items.length===0);
 }finally{await pollEditor.close();}
 // These guards check CI/local loopback at startup. This database-owner write
 // is an explicit test fixture, never a migration, provider or hosted action.
 mark('activate disposable local poll gate only');
 sql('local poll gate',['-f','-'],'update newsroom_private.poll_settings set public_enabled=true where singleton;');
 const readerContext=await adminTestContext(users.reader.email);
 try{
  const post=(path,data)=>readerContext.request.post(appOrigin+path,{headers:{Origin:appOrigin},data});
  const publicPolls=await anonymous.rpc('public_list_polls',{p_language:'en',p_page:0});
  const publicPoll=publicPolls.data?.items.find(p=>p.id===pollState.id);
  check('anonymous poll projection excludes identity and open counts',!publicPolls.error&&publicPoll?.open===true&&publicPoll.ownChoice===null&&publicPoll.counts===null);
  const votePath='/api/polls/'+pollState.id+'/vote';
  const anonymousContext=await browser.newContext();
  try{
   check('anonymous cannot cast poll vote',(await anonymousContext.request.post(appOrigin+votePath,{headers:{Origin:appOrigin},data:{choice:0}})).status()===401);
  }finally{await anonymousContext.close();}
  check('invalid poll choice rejected',(await post(votePath,{choice:7})).status()===422);
  const first=await post(votePath,{choice:0});
  check('verified reader casts actual poll vote',first.status()===200&&(await first.json()).alreadyVoted===false);
  const replay=await post(votePath,{choice:0});
  check('same poll vote is idempotent',replay.status()===200&&(await replay.json()).alreadyVoted===true);
  check('changing recorded vote denied',(await post(votePath,{choice:1})).status()===409);
  const own=await users.reader.client.rpc('public_list_polls',{p_language:'en',p_page:0});
  const ownPoll=own.data?.items.find(p=>p.id===pollState.id);
  check('reader sees own choice but not aggregate counts',!own.error&&ownPoll?.ownChoice===0&&ownPoll.counts===null);
  const other=await users.legacy.client.rpc('public_list_polls',{p_language:'en',p_page:0});
  check('unrelated verified account sees no other choice',!other.error&&other.data.items.find(p=>p.id===pollState.id)?.ownChoice===null);
  for(const [role,choice] of [['legacy',1],['staff_writer',0],['freelancer',1],['moderator',0]]){
   const ballot=await users[role].client.rpc('reader_vote_poll',{p_id:pollState.id,p_choice:choice});
   check('real JWT separate poll ballot '+role,!ballot.error&&ballot.data.alreadyVoted===false);
  }
  const overflow=await users.editor.client.rpc('reader_vote_poll',{p_id:pollState.id,p_choice:1});
  check('poll response cap prevents further voting',overflow.error?.code==='40001');
  const capped=await anonymous.rpc('public_list_polls',{p_language:'en',p_page:0});
  const cappedPoll=capped.data?.items.find(p=>p.id===pollState.id);
  check('cap closes poll without automatic results release',!capped.error&&cappedPoll?.open===false&&cappedPoll.counts===null);
  const exported=await readerContext.request.get(appOrigin+'/api/account/export');
  check('reader export contains only own poll ballot',exported.status()===200&&(await exported.json()).pollVotes.filter(v=>v.poll_id===pollState.id).length===1);
  const profile=await readerContext.request.get(appOrigin+'/api/account/profile');
  check('reader account remains active with declined deletion receipt',profile.status()===200&&(await profile.json()).requests.some(r=>r.id===privacyRequestId&&r.status==='declined'));
  const notices=await readerContext.request.get(appOrigin+'/api/account/notifications');
  check('reader inbox loads real generated events',notices.status()===200);
  const inbox=await notices.json();
  const news=inbox.items.find(n=>n.kind==='story'&&n.slug==='ct15-assigned');
  const privacy=inbox.items.filter(n=>n.kind==='privacy');
  check('publication and owner privacy decisions generate reader notices',!!news&&privacy.some(n=>n.requestStatus==='reviewing')&&privacy.some(n=>n.requestStatus==='declined'));
  const otherNotices=await users.legacy.client.rpc('reader_read_notices',{p_page:0});
  check('other reader cannot see private decision notices',!otherNotices.error&&!otherNotices.data.items.some(n=>n.kind==='privacy'));
  const read=await post('/api/account/notifications',{action:'read',id:news.id,page:0});
  check('mark individual notification read',read.status()===200&&(await read.json()).items.some(n=>n.id===news.id&&n.read));
  const unread=await post('/api/account/notifications',{action:'unread',id:news.id,page:0});
  check('mark individual notification unread',unread.status()===200&&(await unread.json()).items.some(n=>n.id===news.id&&!n.read));
  const all=await post('/api/account/notifications',{action:'read_all',page:0});
  check('mark all notifications read',all.status()===200&&(await all.json()).unread===0);
 }finally{await readerContext.close();}
 const finishOwner=await adminTestContext(users.owner.email);
 try{
  const current=await users.owner.client.rpc('staff_list_polls',{p_page:0});
  assert.ok(!current.error);
  const capped=current.data.items.find(p=>p.id===pollState.id);
  const release=await finishOwner.request.post(appOrigin+'/api/newsroom/polls',{headers:{Origin:appOrigin},data:{action:'release_results',id:capped.id,version:capped.version,copy:null}});
  check('owner releases threshold-qualified aggregate results',release.status()===200&&(await release.json()).resultsReleased===true);
  const result=await anonymous.rpc('public_list_polls',{p_language:'en',p_page:0});
  check('public aggregate exactly matches five votes',!result.error&&JSON.stringify(result.data.items.find(p=>p.id===pollState.id)?.counts)==='[3,2]');
  const latest=await users.owner.client.rpc('staff_list_polls',{p_page:0});
  const published=latest.data.items.find(p=>p.id===pollState.id);
  const retired=await finishOwner.request.post(appOrigin+'/api/newsroom/polls',{headers:{Origin:appOrigin},data:{action:'retire',id:published.id,version:published.version,copy:null}});
  check('owner retires poll',retired.status()===200&&(await retired.json()).status==='retired');
  const retiredPublic=await anonymous.rpc('public_list_polls',{p_language:'en',p_page:0});
  check('retired poll no longer appears publicly',!retiredPublic.error&&!retiredPublic.data.items.some(p=>p.id===pollState.id));
  const team=await (await finishOwner.request.get(appOrigin+'/api/newsroom/team')).json();
  const editor=team.members.find(m=>m.roles.some(r=>r.roleKey==='editor'));
  for(const capability of ['poll.view_manage','poll.publish']){
   const remove=await finishOwner.request.post(appOrigin+'/api/newsroom/team/override-change',{headers:{Origin:appOrigin},data:{targetMembershipId:editor.id,operation:'remove',capability,scope:'all',effect:null,expiresAt:null,reason:'CT15 remove disposable poll reviewer grant'}});
   check('temporary poll reviewer grant removed '+capability,remove.status()===200);
  }
 }finally{await finishOwner.close();sql('local poll gate off',['-f','-'],'update newsroom_private.poll_settings set public_enabled=false where singleton;');}
 check('local poll gate reset and external newsletter delivery remains off',sql('provider gates',['-At','-f','-'],"select (not (select public_enabled from newsroom_private.poll_settings where singleton) and not (select delivery_enabled from newsroom_private.newsletter_settings where singleton))::text;")==='true');

 report.success=true;
}catch(e){report.error=redact(e instanceof Error?e.message:String(e)).slice(0,500);throw new Error(report.error);}
finally{
 if(browser)await browser.close();
 if(app&&app.exitCode===null)app.kill('SIGTERM');
 checkpoint();
}
