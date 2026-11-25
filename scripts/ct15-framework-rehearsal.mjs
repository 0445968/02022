/** Disposable CI only: prepare a Next 16 candidate and report failures.
 * No production deployment, no hosted API keys, no automatic commit/push.
 * The repository's current package.json/lockfile remain intact on GitHub until
 * the generated patch has been inspected and applied in a later reviewed commit.
 */
import {readFileSync,writeFileSync,existsSync,rmSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const version='16.4.6';
assert.equal(process.env.CT15_DISPOSABLE_REHEARSAL,'yes');
assert.equal(process.env.CI,'true');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://example.supabase.co');
assert.equal(process.env.DEV_AUTH_BYPASS,'false');
for(const k of ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','RESEND_API_KEY','STRIPE_SECRET_KEY','VERCEL_TOKEN'])assert.ok(!process.env[k],'No privileged credentials in rehearsal');
const run=(cmd,args,opts={})=>{console.log('$ '+cmd+' '+args.join(' '));const p=spawnSync(cmd,args,{stdio:'inherit',...opts});if(p.error||p.status!==0)throw Error(cmd+' failed: '+(p.status??p.error?.message));};
const result={target:version,steps:[],success:false};
const stage=(name,fn,diagnostic=false)=>{console.log('::group::'+name);try{fn();result.steps.push({name,ok:true});}catch(e){result.steps.push({name,ok:false,error:String(e)});console.error(String(e));if(!diagnostic)throw e;}finally{console.log('::endgroup::');}};
const out=process.env.CT15_EVIDENCE_DIR;
assert.ok(out&&out.startsWith(process.env.RUNNER_TEMP+'/'));
mkdirSync(out,{recursive:true});
try{
 stage('Prepare candidate dependency manifest',()=>{
  const p=JSON.parse(readFileSync('package.json','utf8'));
  // Native Next SWC is installed by Next; the old manually pinned WASM
  // binary is incompatible with the new framework.
  delete p.dependencies['@next/swc-wasm-nodejs'];
  p.dependencies.next=version;p.dependencies['eslint-config-next']=version;
  // Resolve the observed stable React 19.3.1 and compatible UI-library versions
  // in this disposable job;
  // npm --save-exact stores the resulting versions. Never force peer conflicts.
  p.dependencies.typescript='^5.9.3';
  p.dependencies['react-day-picker']='9.11.1';
  p.dependencies['react-resizable-panels']='2.1.9';
  p.dependencies.recharts='2.15.4';
  p.dependencies.sonner='1.7.4';
  p.dependencies.vaul='1.1.2';
  p.dependencies['next-themes']='0.4.6';
  p.scripts.lint='eslint .';p.scripts.build='next build --webpack';
  writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
  const radix=Object.entries(p.dependencies).filter(([k])=>k.startsWith('@radix-ui/')).map(([k,v])=>k+'@'+v);
  run('npm',['install','--save-exact','--ignore-scripts','--strict-peer-deps','react@19.3.1','react-dom@19.3.1','@types/react@19','@types/react-dom@19','eslint@9',...radix]);
 });
 stage('Adapt candidate date picker to React 19',()=>{
  let calendar=readFileSync('components/ui/calendar.tsx','utf8');
  const renamed={caption:'month_caption',nav_button_previous:'button_previous',nav_button_next:'button_next',table:'month_grid',head_row:'weekdays',head_cell:'weekday',row:'week',cell:'day',day:'day_button',day_range_end:'range_end',day_selected:'selected',day_today:'today',day_outside:'outside',day_disabled:'disabled',day_range_middle:'range_middle',day_hidden:'hidden'};
  for(const [from,to] of Object.entries(renamed))calendar=calendar.replace(new RegExp('(^\\s*)'+from+':','m'),'$1__ct15_'+to+':');
  calendar=calendar.replaceAll('__ct15_','').replace(/        nav_button: cn\([\s\S]*?\),\n/,'');
  calendar=calendar.replace("button_previous: 'absolute left-1',","button_previous: cn(buttonVariants({variant:'outline'}),'absolute left-1 h-7 w-7 p-0'),");
  calendar=calendar.replace("button_next: 'absolute right-1',","button_next: cn(buttonVariants({variant:'outline'}),'absolute right-1 h-7 w-7 p-0'),");
  calendar=calendar.replace(/        IconLeft:[^\n]+\n        IconRight:[^\n]+/,"        Chevron: ({orientation,className}) => orientation==='left'?<ChevronLeft className={cn('h-4 w-4',className)}/>:<ChevronRight className={cn('h-4 w-4',className)}/>,");
  if(calendar.includes('IconLeft:')||calendar.includes('__ct15_'))throw Error('Calendar adapter incomplete');
  writeFileSync('components/ui/calendar.tsx',calendar);
 });
 stage('Apply official async request API codemod',()=>{
  run('npx',['--yes','@next/codemod@'+version,'next-async-request-api','.','--force']);
  // Codemod can mark manual cases; fail instead of silently accepting them.
  const p=spawnSync('git',['grep','-n','@next-codemod-error','--','app','lib','components'],{encoding:'utf8'});
  if(p.status===0){console.log(p.stdout);throw Error('Manual codemod cases remain');}
  if(p.status!==1)throw Error('Could not inspect codemod markers');
 },true);
 stage('Configure Next 16 build and flat lint',()=>{
  let s=readFileSync('next.config.js','utf8');
  s=s.replace(/  eslint: \{[\s\S]*?\},\n/,'').replace(/  typescript: \{[\s\S]*?\},\n/,'');
  writeFileSync('next.config.js',s);
  if(existsSync('.eslintrc.json'))rmSync('.eslintrc.json');
  writeFileSync('eslint.config.mjs',"import {defineConfig,globalIgnores} from 'eslint/config';\nimport nextVitals from 'eslint-config-next/core-web-vitals';\nexport default defineConfig([...nextVitals,globalIgnores(['.next/**','out/**','build/**','next-env.d.ts','ct15-browser-evidence/**'])]);\n");
 });
 stage('Verify locked candidate installation',()=>run('npm',['ci','--ignore-scripts','--strict-peer-deps']));
 stage('Verify resolved dependency tree',()=>run('npm',['ls','--all']),true);
 stage('Dependency audit (high and critical)',()=>run('npm',['audit','--audit-level=high']),true);
 stage('Unit and authorization tests',()=>run('npm',['test']),true);
 stage('Generate Next route types',()=>run('npx',['--no-install','next','typegen']),true);
 stage('TypeScript',()=>run('npm',['run','typecheck']),true);
 stage('ESLint',()=>run('npm',['run','lint']),true);
 stage('Next production build (not deployment)',()=>run('npm',['run','build']),true);
 result.success=result.steps.every(x=>x.ok);if(!result.success)process.exitCode=1;
}catch(e){console.error(String(e));process.exitCode=1;}
finally{
 // Include new generated source and lockfile, not .next, node_modules or logs.
 run('git',['add','-N','--','app','lib','components','package.json','package-lock.json','next.config.js','tsconfig.json']);
 if(existsSync('eslint.config.mjs'))run('git',['add','-N','--','eslint.config.mjs']);
 const patch=spawnSync('git',['diff','--binary','HEAD','--','.eslintrc.json','eslint.config.mjs','app','lib','components','middleware.ts','package.json','package-lock.json','next.config.js','tsconfig.json'],{encoding:'utf8',maxBuffer:32*1024*1024});
 assert.equal(patch.status,0);
 writeFileSync(out+'/candidate.patch',patch.stdout);
 writeFileSync(out+'/result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}
