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
 // Do not activate provider sends, cron, public polls, payments or destructive jobs.
 const flags={
  DEV_AUTH_BYPASS:'false',CT_STAFF_ACCESS_V2_ENABLED:'true',CT_READER_ACCOUNT_ENABLED:'true',
  CT_STAFF_ONBOARDING_ENABLED:'true',CT_MEDIA_PRIVATE_DRAFTS_ENABLED:'true',
  CT_COMMENT_MODERATION_ENABLED:'true',CT_COMMENT_REPORTS_ENABLED:'true',
  CT_ASSIGNED_DRAFT_EDITOR_ENABLED:'true',CT_ASSIGNED_REVISION_EDITOR_ENABLED:'true',
  CT_WRITER_DRAFT_CREATION_ENABLED:'true',CT_STORY_REVIEW_ENABLED:'true',
  CT_STAFF_ADMIN_MUTATIONS_ENABLED:'true',CT_READER_COMMUNICATIONS_ENABLED:'true',
  CT_EDITORIAL_CALENDAR_ENABLED:'true',CT_POLLS_ENABLED:'true',CT_REVIEW_INBOX_ENABLED:'true',CT_STORY_ASSIGNMENTS_ENABLED:'true',
  CT_HOMEPAGE_HISTORY_ENABLED:'true',CT_READER_REPORTING_ENABLED:'true'
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
 for(const role of ['owner','staff_writer','freelancer','editor','moderator','reader','legacy']){
  mark('authenticated browser '+role);
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  let page;
  try{
   await context.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.origin===appOrigin&&(['GET','HEAD'].includes(method)||(method==='POST'&&['/api/newsroom/onboarding','/api/account/profile','/api/newsroom/contributor/stories'].includes(url.pathname))||(method==='PUT'&&/^\/api\/newsroom\/contributor\/stories\/[0-9a-f-]{36}$/.test(url.pathname))))return route.continue();
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
    await page.goto(appOrigin+'/account/profile',{waitUntil:'domcontentloaded',timeout:20000});
    const form=page.locator('#account-main form').filter({has:page.getByLabel('Display name',{exact:true})});
    await form.getByLabel('Display name',{exact:true}).fill(payload.displayName);
    await form.getByLabel('Account language',{exact:true}).selectOption('es');
    await form.getByLabel('Choose avatar',{exact:true}).selectOption('ocean');
    const [change]=await Promise.all([
      page.waitForResponse(r=>r.url()===appOrigin+'/api/account/profile'&&r.request().method()==='POST'),
      form.getByRole('button',{name:'Save profile',exact:true}).click()
    ]);
    check('reader actual profile form save (HTTP '+change.status()+')',change.status()===200&&(await change.json()).displayName==='CT15 Updated Reader');
    const stale=await page.evaluate(async timestamp=>{
      const r=await fetch('/api/account/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',expectedUpdatedAt:timestamp,displayName:'Stale overwrite',locale:'en',avatar:'initials'})});
      return r.status;
    },initial.updatedAt);
    check('reader stale profile rejected (HTTP '+stale+')',stale===409);
    const retained=await context.request.get(appOrigin+'/api/account/profile');
    check('reader saved identity retained',retained.status()===200&&(await retained.json()).displayName==='CT15 Updated Reader');
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
    const changes={action:'preferences',expectedRevision:prefs.revision,stories:!prefs.stories,replies:prefs.replies,privacy:prefs.privacy,page:0};
    const updated=await post('/api/account/notifications',changes);
    check('reader notification preferences persisted',updated.status()===200&&(await updated.json()).preferences.stories===changes.stories);
    const outdated=await post('/api/account/notifications',changes);
    check('reader stale preference write rejected',outdated.status()===409);
    const newsletters=await context.request.get(appOrigin+'/api/account/newsletters');
    check('reader newsletter topics visible without delivery',newsletters.status()===200&&(await newsletters.json()).deliveryEnabled===false);
    const subscribe=await post('/api/account/newsletters',{action:'subscribe',topic:'latest'});
    check('newsletter send stays disabled (HTTP '+subscribe.status()+')',subscribe.status()===503);
   }
   const team=await context.request.get(appOrigin+'/api/newsroom/team');
   check(role+' team route authorization (HTTP '+team.status()+')',team.status()===(role==='owner'?200:404));
   if(role==='owner'){
    const directory=await team.json();
    check('owner sees exactly five synthetic members and own row',directory.totalMembers===5&&directory.members.filter(m=>m.isSelf).length===1);
    check('owner local role mutation flag only',directory.mutationsEnabled===true&&directory.overrideMutationsEnabled===false&&directory.presetMutationsEnabled===false);
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
   }
   if(role==='moderator'){
    await page.goto(appOrigin+'/newsroom/comments',{waitUntil:'domcontentloaded',timeout:20000});
    await page.getByRole('heading',{name:'Comments',exact:true}).waitFor({state:'visible'});
    check('moderator comment workspace available',true);
    await page.goto(appOrigin+'/newsroom/reports',{waitUntil:'domcontentloaded',timeout:20000});
    await page.getByRole('heading',{name:'Reports',exact:true}).waitFor({state:'visible'});
    check('moderator reports workspace available',true);
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
      await page.waitForFunction(()=>document.documentElement.lang===document.querySelector('[lang]:not(html)')?.getAttribute('lang'),{},{timeout:5000}).catch(()=>{});
      metrics=await page.evaluate(()=>{
       const m=document.querySelector('main');
       const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
       return {root:document.documentElement.scrollWidth,viewport:innerWidth,main:m?.clientWidth,scroll:m?.scrollWidth,mains:document.querySelectorAll('main').length,headings:[...document.querySelectorAll('h1')].filter(visible).length,mainHeadings:[...(m?.querySelectorAll('h1')??[])].filter(visible).length,lang:document.documentElement.lang,alerts:[...(m?.querySelectorAll('[role=alert]')??[])].filter(visible).map(a=>a.textContent?.slice(0,160))};
      });
      const ok=response?.status()===200&&new URL(page.url()).pathname===path&&metrics.root<=width+1&&metrics.scroll<=metrics.main+1&&metrics.mains===1&&metrics.headings===1&&metrics.mainHeadings===1&&metrics.lang===(role==='reader'?'es':'en')&&errors.length===0;
      report.pageAudits??=[];report.pageAudits.push({role,path,width,status:response?.status(),metrics,errors,ok});checkpoint();
      await page.screenshot({path:resolve(output,key+'-audit.png'),fullPage:true,timeout:10000,animations:'disabled'});
      check(role+' page audit '+path+' '+width+'px',ok);
     }finally{page.off('pageerror',onError);}
    }catch(e){
     const error=redact(e instanceof Error?e.message:String(e)).slice(0,500);
     report.roleErrors.push({role,path,width,error});console.log('PAGE AUDIT FAILURE '+key+' '+error);checkpoint();
    }
   }
   await page.setViewportSize({width:1440,height:900});
   if(role==='owner'){
    await page.goto(appOrigin+'/newsroom',{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('header').getByRole('button',{name:/sign out|log out/i}).first().click();
    await page.waitForURL(url=>['/','/en','/es'].includes(url.pathname),{timeout:15000});
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
 report.success=true;
}catch(e){report.error=redact(e instanceof Error?e.message:String(e)).slice(0,500);throw new Error(report.error);}
finally{
 if(browser)await browser.close();
 if(app&&app.exitCode===null)app.kill('SIGTERM');
 checkpoint();
}
